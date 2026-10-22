import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import { FEATURES, breakdown, makeNormalizers, scoreCell } from "./lib/score";
import Badge from "./components/Badge";
import AboutModal from "./components/AboutModal";

const HEAT = ["#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"];
const RED = ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"];
const BLUE = ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"];

const LAYERS = {
  risk: {
    label: "風險分數",
    palette: HEAT,
    stroke: "#7c2d12",
    fixedCuts: [20, 40, 60, 80],
    fmt: (v) => `風險 ${Math.round(v)} 分`,
    source: "依權重由通報與人孔計算（練習版模型）",
  },
  reports: {
    label: "通報數",
    palette: RED,
    stroke: "#7f1d1d",
    fmt: (v) => `${v} 筆通報`,
    source: "見鼠地圖（真實，已聚合）",
  },
  manholes: {
    label: "人孔數",
    palette: BLUE,
    stroke: "#1e3a8a",
    fmt: (v) => `${v} 個人孔`,
    source: "雨水人孔，僅正常人孔（真實）",
  },
};

const LAYER_PROVENANCE = { risk: "model", reports: "real", manholes: "real" };

const place = (p) =>
  p.district
    ? `${p.district}${p.village ? `・${p.village}` : ""}`
    : "（位置不明）";

// 建立色階：固定門檻（風險分數）或依資料分布的分位數（計數圖層）
function makeScale(values, palette, fixedCuts) {
  let cuts = fixedCuts;
  let sorted = null;
  if (!cuts) {
    sorted = [...values].sort((a, b) => a - b);
    cuts = [];
    for (let i = 1; i < palette.length; i++) {
      const q = sorted[Math.floor((i / palette.length) * sorted.length)];
      if (q > sorted[0] && !cuts.includes(q)) cuts.push(q);
    }
  }
  const colors = palette.slice(palette.length - (cuts.length + 1));
  const labels = colors.map((_, k) => {
    if (fixedCuts) {
      if (k === 0) return `<${cuts[0]}`;
      if (k === cuts.length) return `${cuts[k - 1]}+`;
      return `${cuts[k - 1]}–${cuts[k]}`;
    }
    const lo = k === 0 ? sorted[0] : cuts[k - 1];
    if (k === cuts.length) return `${lo}+`;
    const hi = cuts[k] - 1;
    return lo === hi ? `${lo}` : `${lo}–${hi}`;
  });
  const colorFor = (v) => colors[cuts.filter((c) => v >= c).length];
  return { colors, labels, colorFor };
}

export default function App() {
  const mapDiv = useRef(null);
  const mapRef = useRef(null);
  const [grid, setGrid] = useState(null);
  const [active, setActive] = useState("risk");
  const [selectedId, setSelectedId] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const [weights, setWeights] = useState(() =>
    Object.fromEntries(FEATURES.map((f) => [f.key, f.defaultWeight])),
  );

  // 建立地圖並讀取資料（只跑一次）
  useEffect(() => {
    const map = L.map(mapDiv.current).setView([25.05, 121.55], 12);
    mapRef.current = map;
    // 專門放「選取框」的圖層，確保它永遠蓋在色塊上面
    map.createPane("highlight").style.zIndex = 450;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    let cancelled = false;
    fetch("/data/grid.geojson")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setGrid(data);
      });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const norm = useMemo(
    () => (grid ? makeNormalizers(FEATURES, grid) : null),
    [grid],
  );

  // 每格的風險分數（不論目前顯示哪個圖層，排名一律依風險分數）
  const rows = useMemo(() => {
    if (!grid || !norm) return null;
    return grid.features.map((feature) => ({
      feature,
      risk: scoreCell(feature.properties, FEATURES, weights, norm),
    }));
  }, [grid, norm, weights]);

  // 排名：分數相同時，通報多的優先，再來是人孔多的
  const ranking = useMemo(() => {
    if (!rows) return null;
    return rows
      .filter((r) => r.risk > 0)
      .sort(
        (a, b) =>
          b.risk - a.risk ||
          b.feature.properties.reports - a.feature.properties.reports ||
          b.feature.properties.manholes - a.feature.properties.manholes,
      );
  }, [rows]);

  // 目前圖層要畫的數值，放在 properties.value
  const data = useMemo(() => {
    if (!rows) return null;
    return {
      type: "FeatureCollection",
      features: rows.map(({ feature, risk }) => ({
        ...feature,
        properties: {
          ...feature.properties,
          value: active === "risk" ? risk : feature.properties[active],
        },
      })),
    };
  }, [rows, active]);

  const scale = useMemo(() => {
    if (!data) return null;
    const values = data.features
      .map((f) => f.properties.value)
      .filter((v) => v > 0);
    if (!values.length) return null;
    return makeScale(values, LAYERS[active].palette, LAYERS[active].fixedCuts);
  }, [data, active]);

  const summary = useMemo(() => {
    if (!data) return null;
    const vals = data.features
      .map((f) => f.properties.value)
      .filter((v) => v > 0);
    return { cells: vals.length, total: vals.reduce((a, b) => a + b, 0) };
  }, [data]);

  const selected = useMemo(() => {
    if (!rows || !ranking || !selectedId) return null;
    const row = rows.find((r) => r.feature.properties.id === selectedId);
    if (!row) return null;
    const props = row.feature.properties;
    return {
      props,
      risk: row.risk,
      rank:
        ranking.findIndex((r) => r.feature.properties.id === selectedId) + 1,
      parts: breakdown(props, FEATURES, weights, norm),
    };
  }, [rows, ranking, selectedId, weights, norm]);

  // 資料、圖層或權重改變時重畫格子
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data || !scale) return;
    const cfg = LAYERS[active];
    const layer = L.geoJSON(data, {
      filter: (f) => f.properties.value > 0,
      style: (f) => ({
        color: cfg.stroke,
        weight: 0.5,
        fillColor: scale.colorFor(f.properties.value),
        fillOpacity: 0.65,
      }),
      onEachFeature: (f, l) => {
        l.bindTooltip(
          `${place(f.properties)}<br>${cfg.fmt(f.properties.value)}`,
        );
        l.on("click", () => setSelectedId(f.properties.id));
      },
    }).addTo(map);
    return () => layer.remove();
  }, [data, active, scale]);

  // 被選取的格子畫一圈粗黑框
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !grid || !selectedId) return;
    const feature = grid.features.find((f) => f.properties.id === selectedId);
    if (!feature) return;
    const layer = L.geoJSON(feature, {
      pane: "highlight",
      interactive: false,
      style: { color: "#111827", weight: 3, fill: false },
    }).addTo(map);
    return () => layer.remove();
  }, [grid, selectedId]);

  // 點清單：選取並把地圖移過去
  const focusCell = (feature) => {
    setSelectedId(feature.properties.id);
    mapRef.current?.flyToBounds(L.geoJSON(feature).getBounds(), {
      maxZoom: 15,
    });
  };

  const cfg = LAYERS[active];

  return (
    <div className="app">
      <header className="topbar">
        <span>鼠患風險地圖（練習版）</span>
        {summary && (
          <span className="stats">
            {active === "risk"
              ? `${summary.cells} 格有風險分數`
              : `${summary.cells} 格有資料・共 ${summary.total}`}
          </span>
        )}
        <button className="about-btn" onClick={() => setShowAbout(true)}>
          資料說明
        </button>
      </header>

      <div className="main">
        <div className="map-wrap">
          <div ref={mapDiv} className="map" />

          <div className="layer-switch">
            {Object.entries(LAYERS).map(([key, l]) => (
              <button
                key={key}
                className={key === active ? "on" : ""}
                onClick={() => setActive(key)}
              >
                {l.label}
              </button>
            ))}
          </div>

          {active === "risk" && (
            <div className="weights">
              <div className="weights-title">風險權重</div>
              {FEATURES.map((f) => (
                <label key={f.key} className="weight-row">
                  <span className="weight-name">
                    {f.label} <Badge kind={f.provenance} />
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={weights[f.key]}
                    onChange={(e) =>
                      setWeights((w) => ({
                        ...w,
                        [f.key]: Number(e.target.value),
                      }))
                    }
                  />
                  <span className="weight-val">{weights[f.key]}</span>
                </label>
              ))}
              <div className="weights-note">
                只看相對比例；預設各半是練習用假設
              </div>
            </div>
          )}

          {scale && (
            <div className="legend">
              <div className="legend-title">
                每格{cfg.label} <Badge kind={LAYER_PROVENANCE[active]} />
              </div>
              {scale.labels.map((label, k) => (
                <div key={label} className="legend-row">
                  <span
                    className="swatch"
                    style={{ background: scale.colors[k] }}
                  />
                  {label}
                </div>
              ))}
              <div className="legend-note">資料：{cfg.source}</div>
            </div>
          )}
        </div>

        <aside className="sidebar">
          <section>
            <h2>格子詳情</h2>
            {selected ? (
              <>
                <div className="detail-place">{place(selected.props)}</div>
                <div className="detail-score">
                  風險 {Math.round(selected.risk)} 分
                  {selected.rank > 0 && (
                    <small>
                      （第 {selected.rank} / {ranking.length} 名）
                    </small>
                  )}
                </div>
                {selected.parts.map((p) => (
                  <div key={p.key} className="part">
                    <div className="part-head">
                      <span>
                        {p.label}：{p.raw}
                      </span>
                      <span>+{p.points.toFixed(0)} 分</span>
                    </div>
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{ width: `${p.points}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="detail-note">
                  每格約 500 公尺見方；位置名稱取格內最多的行政里，僅供參考。
                </div>
              </>
            ) : (
              <p className="hint">點地圖上的格子，或點下方清單。</p>
            )}
          </section>

          <section>
            <h2>優先處理前 10 格</h2>
            {ranking && (
              <ol className="toplist">
                {ranking.slice(0, 10).map(({ feature, risk }, i) => (
                  <li key={feature.properties.id}>
                    <button
                      className={
                        feature.properties.id === selectedId ? "on" : ""
                      }
                      onClick={() => focusCell(feature)}
                    >
                      <span className="rank">{i + 1}</span>
                      <span className="place">{place(feature.properties)}</span>
                      <span className="pts">{Math.round(risk)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}
