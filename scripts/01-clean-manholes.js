import fs from "node:fs";
import { parse } from "csv-parse/sync";
import proj4 from "proj4";

// TWD97 / TM2 121 分帶（EPSG:3826）轉成經緯度（WGS84）
proj4.defs(
  "EPSG:3826",
  "+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +units=m +no_defs",
);

const rows = parse(fs.readFileSync("data/raw/manholes.csv", "utf8"), {
  columns: true,
  skip_empty_lines: true,
  bom: true,
});

// 排除條件寫在這裡，之後想調整只改這兩行
const isActive = (r) => r["使用狀態"] === "使用";
// 依市府說明：以「正常人孔」為主；虛人孔沒有洞、覆蓋人孔無法開啟
const isNormal = (r) => r["人孔種類"] === "正常人孔";

const s1 = rows.filter(isActive);
const s2 = s1.filter(isNormal);

const cleaned = [];
let badCoord = 0;

for (const r of s2) {
  const x = parseFloat(r["X坐標"]);
  const y = parseFloat(r["Y坐標"]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    badCoord++;
    continue;
  }
  const [lng, lat] = proj4("EPSG:3826", "WGS84", [x, y]);
  if (!(lat > 24.9 && lat < 25.3 && lng > 121.4 && lng < 121.7)) {
    badCoord++;
    continue;
  }
  cleaned.push({
    district: r["行政區"],
    village: r["行政里"],
    kind: r["人孔種類"],
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
  });
}

fs.mkdirSync("data/clean", { recursive: true });
fs.writeFileSync("data/clean/manholes-clean.json", JSON.stringify(cleaned));

console.log("原始筆數:", rows.length);
console.log("只留使用中:", s1.length);
console.log("只留正常人孔:", s2.length);
console.log("座標異常剔除:", badCoord);
console.log("最終筆數:", cleaned.length);

const lats = cleaned.map((c) => c.lat);
const lngs = cleaned.map((c) => c.lng);
console.log("緯度範圍:", Math.min(...lats), "~", Math.max(...lats));
console.log("經度範圍:", Math.min(...lngs), "~", Math.max(...lngs));
console.log("第一筆轉換結果:", cleaned[0]);
