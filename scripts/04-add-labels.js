import fs from "node:fs";

const grid = JSON.parse(fs.readFileSync("public/data/grid.geojson", "utf8"));
const manholes = JSON.parse(
  fs.readFileSync("data/clean/manholes-clean.json", "utf8"),
);
const reports = JSON.parse(
  fs.readFileSync("data/clean/ratdar-clean.json", "utf8"),
);

// 和 03 相同的做法：記下每格四個邊界，用大小比較找出點在哪一格
// （之後若要整理，可以把這段抽成共用的小工具）
const boxes = grid.features.map((f) => {
  const ring = f.geometry.coordinates[0];
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  return {
    w: Math.min(...xs),
    e: Math.max(...xs),
    s: Math.min(...ys),
    n: Math.max(...ys),
  };
});
const findCell = (lng, lat) =>
  boxes.findIndex((b) => lng >= b.w && lng < b.e && lat >= b.s && lat < b.n);

const tally = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
const mostCommon = (map) => {
  let best = null;
  let n = 0;
  for (const [k, v] of map) {
    if (v > n) {
      best = k;
      n = v;
    }
  }
  return best;
};

// 每格各準備三個「計數表」
const mhDistrict = grid.features.map(() => new Map());
const mhVillage = grid.features.map(() => new Map());
const rpDistrict = grid.features.map(() => new Map());

for (const m of manholes) {
  const i = findCell(m.lng, m.lat);
  if (i === -1) continue;
  tally(mhDistrict[i], m.district);
  tally(mhVillage[i], m.village);
}
for (const r of reports) {
  const i = findCell(r.lng, r.lat);
  if (i === -1) continue;
  tally(rpDistrict[i], r.district);
}

grid.features.forEach((f, i) => {
  f.properties.district =
    mostCommon(mhDistrict[i]) ?? mostCommon(rpDistrict[i]);
  f.properties.village = mostCommon(mhVillage[i]);
});

fs.writeFileSync("public/data/grid.geojson", JSON.stringify(grid));

// ---- 統計 ----
const hasData = grid.features.filter(
  (f) => f.properties.reports > 0 || f.properties.manholes > 0,
);
console.log("有資料的格子:", hasData.length);
console.log(
  "其中有標行政區:",
  hasData.filter((f) => f.properties.district).length,
);
console.log("其中有標里:", hasData.filter((f) => f.properties.village).length);
console.log(
  "跨越多個行政區的格子（標籤只取最多的）:",
  grid.features.filter((_, i) => mhDistrict[i].size > 1).length,
);
