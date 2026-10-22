import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

const RED = ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"];
const BLUE = ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"];

const LAYERS = {
  reports: {
    label: "通報數",
    unit: "筆通報",
    palette: RED,
    stroke: "#7f1d1d",
    source: "見鼠地圖（真實，已聚合）",
  },
  manholes: {
    label: "人孔數",
    unit: "個人孔",
    palette: BLUE,
    stroke: "#1e3a8a",
    source: "雨水人孔，僅正常人孔（真實）",
  },
};

// 依資料分布自動切分級距（分位數），重複的門檻會被合併
function makeScale(values, palette) {
  const sorted = [...values].sort((a, b) => a - b);
  const cuts = [];
  for (let i = 1; i < palette.length; i++) {
    const q = sorted[Math.floor((i / palette.length) * sorted.length)];
    if (q > sorted[0] && !cuts.includes(q)) cuts.push(q);
  }
  const colors = palette.slice(palette.length - (cuts.length + 1));
  const min = sorted[0];
  const labels = colors.map((_, k) => {
    const lo = k === 0 ? min : cuts[k - 1];
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
  const [active, setActive] = useState("reports");

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

  const scale = useMemo(() => {
    if (!grid) return null;
    const values = grid.features
      .map((f) => f.properties[active])
      .filter((v) => v > 0);
    return values.length ? makeScale(values, LAYERS[active].palette) : null;
  }, [grid, active]);

  const summary = useMemo(() => {
    if (!grid) return null;
    const vals = grid.features
      .map((f) => f.properties[active])
      .filter((v) => v > 0);
    return { cells: vals.length, total: vals.reduce((a, b) => a + b, 0) };
  }, [grid, active]);

  // 資料載入或切換圖層時重畫
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !grid || !scale) return;
    const cfg = LAYERS[active];
    const layer = L.geoJSON(grid, {
      filter: (f) => f.properties[active] > 0,
      style: (f) => ({
        color: cfg.stroke,
        weight: 0.5,
        fillColor: scale.colorFor(f.properties[active]),
        fillOpacity: 0.65,
      }),
      onEachFeature: (f, l) =>
        l.bindTooltip(`${f.properties[active]} ${cfg.unit}`),
    }).addTo(map);
    return () => layer.remove();
  }, [grid, active, scale]);

  const cfg = LAYERS[active];

  return (
    <div className="app">
      <header className="topbar">
        鼠患風險地圖（練習版）
        {summary && (
          <span className="stats">
            {summary.cells} 格有資料・共 {summary.total}{" "}
            {cfg.unit.replace("筆", "").replace("個", "")}
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
