import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

const COLORS = ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"];

function colorFor(n) {
  if (n >= 10) return COLORS[4];
  if (n >= 7) return COLORS[3];
  if (n >= 4) return COLORS[2];
  if (n >= 2) return COLORS[1];
  return COLORS[0];
}

const LEGEND = [
  ["1", COLORS[0]],
  ["2–3", COLORS[1]],
  ["4–6", COLORS[2]],
  ["7–9", COLORS[3]],
  ["10+", COLORS[4]],
];

export default function App() {
  const mapRef = useRef(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const map = L.map(mapRef.current).setView([25.05, 121.55], 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    let cancelled = false;
    fetch("/data/grid.geojson")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        L.geoJSON(data, {
          filter: (f) => f.properties.reports > 0,
          style: (f) => ({
            color: "#7f1d1d",
            weight: 0.5,
            fillColor: colorFor(f.properties.reports),
            fillOpacity: 0.65,
          }),
          onEachFeature: (f, layer) =>
            layer.bindTooltip(`${f.properties.reports} 筆通報`),
        }).addTo(map);

        const cells = data.features.filter((f) => f.properties.reports > 0);
        const total = cells.reduce((sum, f) => sum + f.properties.reports, 0);
        setStats({ cells: cells.length, total });
      });

    return () => {
      cancelled = true;
      map.remove();
    };
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        鼠患風險地圖（練習版）
        {stats && (
          <span className="stats">
            {stats.cells} 格有通報・共 {stats.total} 筆
          </span>
        )}
      </header>
      <div className="map-wrap">
        <div ref={mapRef} className="map" />
        <div className="legend">
          <div className="legend-title">每格通報數</div>
          {LEGEND.map(([label, color]) => (
            <div key={label} className="legend-row">
              <span className="swatch" style={{ background: color }} />
              {label}
            </div>
          ))}
          <div className="legend-note">資料：見鼠地圖（真實，已聚合）</div>
        </div>
      </div>
    </div>
  );
}
