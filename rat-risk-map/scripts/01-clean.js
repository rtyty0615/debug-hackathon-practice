import fs from "node:fs";
import { parse } from "csv-parse/sync";

const rows = parse(fs.readFileSync("data/raw/ratdar.csv", "utf8"), {
  columns: true,
  skip_empty_lines: true,
  bom: true,
});

const KEEP_STATUS = new Set(["已審核", "已通報1999"]);

const s1 = rows.filter((r) => KEEP_STATUS.has(r["狀態"]));
const s2 = s1.filter((r) => r["類型"] === "鼠蹤");
const s3 = s2.filter((r) => r["地點"].startsWith("臺北市"));

const cleaned = [];
let badDate = 0;
let badCoord = 0;

for (const r of s3) {
  const lat = parseFloat(r["緯度"]);
  const lng = parseFloat(r["經度"]);
  // 台北市大約落在這個範圍；空值或 0 都會被擋掉
  if (!(lat > 24.9 && lat < 25.3 && lng > 121.4 && lng < 121.7)) {
    badCoord++;
    continue;
  }
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(r["通報時間"].trim());
  if (!m) {
    badDate++;
    continue;
  }
  cleaned.push({
    date: m[1],
    district: r["地點"].replace("臺北市", "").trim(),
    lat: Number(lat.toFixed(3)), // 約 100 公尺精度，降低可辨識性
    lng: Number(lng.toFixed(3)),
  });
}

fs.mkdirSync("data/clean", { recursive: true });
fs.writeFileSync("data/clean/ratdar-clean.json", JSON.stringify(cleaned));

console.log("原始筆數:", rows.length);
console.log("保留已審核/已通報1999:", s1.length);
console.log("只留鼠蹤:", s2.length);
console.log("只留臺北市:", s3.length);
console.log("座標異常剔除:", badCoord, "日期異常剔除:", badDate);
console.log("最終筆數:", cleaned.length);

const dates = cleaned.map((c) => c.date).sort();
console.log("日期範圍:", dates[0], "~", dates[dates.length - 1]);

const byDistrict = {};
for (const c of cleaned)
  byDistrict[c.district] = (byDistrict[c.district] ?? 0) + 1;
console.log("各行政區:", byDistrict);
