import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

export default function App() {
  const mapRef = useRef(null);

  useEffect(() => {
    const map = L.map(mapRef.current).setView([25.033, 121.5654], 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    return () => map.remove();
  }, []);

  return (
    <div className="app">
      <header className="topbar">鼠患風險地圖（練習版）</header>
      <div ref={mapRef} className="map" />
    </div>
  );
}
