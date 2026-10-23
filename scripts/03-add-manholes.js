import fs from "node:fs";

const grid = JSON.parse(fs.readFileSync("public/data/grid.geojson", "utf8"));
const manholes = JSON.parse(
  fs.readFileSync("data/clean/manholes-clean.json", "utf8"),
);

// 每格都是和經緯度軸平行的長方形，只要記下四個邊界，
// 就能用大小比較判斷一個點落在哪一格，比 turf 的多邊形判斷快很多。
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

// 先全部歸零再計數，所以重跑這支腳本不會重複累加
for (const f of grid.features) f.properties.manholes = 0;

let outside = 0;
for (const m of manholes) {
  const i = boxes.findIndex(
    (b) => m.lng >= b.w && m.lng < b.e && m.lat >= b.s && m.lat < b.n,
  );
  if (i === -1) outside += 1;
  else grid.features[i].properties.manholes += 1;
}

fs.writeFileSync("public/data/grid.geojson", JSON.stringify(grid));

// ---- 統計 ----
const mh = grid.features.map((f) => f.properties.manholes);
const nonZero = mh.filter((n) => n > 0).sort((a, b) => a - b);

console.log(
  "放進格子的人孔:",
  mh.reduce((a, b) => a + b, 0),
  "/",
  manholes.length,
  "（落在外框外:",
  outside,
  "）",
);
console.log("有人孔的格子:", nonZero.length);
console.log("每格人孔數 中位數:", nonZero[Math.floor(nonZero.length * 0.5)]);
console.log(
  "每格人孔數 第90百分位:",
  nonZero[Math.floor(nonZero.length * 0.9)],
);
console.log("每格人孔數 最大:", nonZero[nonZero.length - 1]);

const both = grid.features.filter(
  (f) => f.properties.reports > 0 || f.properties.manholes > 0,
);
console.log(
  "有通報但沒有人孔的格子:",
  grid.features.filter(
    (f) => f.properties.reports > 0 && f.properties.manholes === 0,
  ).length,
);

function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let sab = 0,
    saa = 0,
    sbb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma,
      db = b[i] - mb;
    sab += da * db;
    saa += da * da;
    sbb += db * db;
  }
  return sab / Math.sqrt(saa * sbb);
}
const r = pearson(
  both.map((f) => f.properties.reports),
  both.map((f) => f.properties.manholes),
);
console.log(
  "通報數與人孔數的相關係數（只算兩者至少一個大於0的格子）:",
  r.toFixed(2),
);
