import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import { FEATURES, makeNormalizers, scoreCell } from "./lib/score";

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
  const [weights, setWeights] = useState(() =>
    Object.fromEntries(FEATURES.map((f) => [f.key, f.defaultWeight])),
  );

  // 建立地圖並讀取資料（只跑一次）
  useEffect(() => {
    const map = L.map(mapDiv.current).setView([25.05, 121.55], 12);
    mapRef.current = map;
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

  // 為每格算出「目前圖層要顯示的數值」，放在 properties.value
  const data = useMemo(() => {
    if (!grid || !norm) return null;
    return {
      ...grid,
      features: grid.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          value:
            active === "risk"
              ? scoreCell(f.properties, FEATURES, weights, norm)
              : f.properties[active],
        },
      })),
    };
  }, [grid, norm, active, weights]);

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
      onEachFeature: (f, l) => l.bindTooltip(cfg.fmt(f.properties.value)),
    }).addTo(map);
    return () => layer.remove();
  }, [data, active, scale]);

  const cfg = LAYERS[active];

  return (
    <div className="app">
      <header className="topbar">
        鼠患風險地圖（練習版）
        {summary && (
          <span className="stats">
            {active === "risk"
              ? `${summary.cells} 格有風險分數`
              : `${summary.cells} 格有資料・共 ${summary.total}`}
          </span>
        )}
      </header>
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
                <span className="weight-name">{f.label}</span>
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
            <div className="legend-title">每格{cfg.label}</div>
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
    </div>
  );
}
