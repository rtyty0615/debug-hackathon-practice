import fs from "node:fs";
import * as turf from "@turf/turf";

const reports = JSON.parse(
  fs.readFileSync("data/clean/ratdar-clean.json", "utf8"),
);

// 涵蓋臺北市的外框 [西, 南, 東, 北]，會多框到一些新北，之後再過濾
const bbox = [121.45, 24.95, 121.68, 25.22];
const grid = turf.squareGrid(bbox, 0.5, { units: "kilometers" });

grid.features.forEach((cell, i) => {
  cell.properties = { id: `c${String(i).padStart(4, "0")}`, reports: 0 };
});

let outside = 0;
for (const r of reports) {
  const pt = turf.point([r.lng, r.lat]);
  const cell = grid.features.find((c) => turf.booleanPointInPolygon(pt, c));
  if (cell) cell.properties.reports += 1;
  else outside += 1;
}

// 座標只保留 5 位小數（約 1 公尺），檔案比較小
for (const c of grid.features) {
  c.geometry.coordinates = c.geometry.coordinates.map((ring) =>
    ring.map(([x, y]) => [Number(x.toFixed(5)), Number(y.toFixed(5))]),
  );
}

fs.mkdirSync("public/data", { recursive: true });
fs.writeFileSync("public/data/grid.geojson", JSON.stringify(grid));

const counts = grid.features.map((c) => c.properties.reports);
const nonZero = counts.filter((n) => n > 0);
const placed = counts.reduce((a, b) => a + b, 0);

console.log("格子總數:", grid.features.length);
console.log("有通報的格子:", nonZero.length);
console.log("單格最多通報:", Math.max(...counts));
console.log(
  "放進格子的通報:",
  placed,
  "/",
  reports.length,
  "（落在外框外:",
  outside,
  "）",
);

const dist = {};
for (const n of counts) {
  const key = n >= 10 ? "10+" : String(n);
  dist[key] = (dist[key] ?? 0) + 1;
}
console.log("每格通報數分布:", dist);
