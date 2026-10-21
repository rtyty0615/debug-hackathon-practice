import fs from "node:fs";
import { parse } from "csv-parse/sync";

const file = process.argv[2] ?? "data/raw/ratdar.csv";
const text = fs.readFileSync(file, "utf8");
const rows = parse(text, { columns: true, skip_empty_lines: true, bom: true });

console.log("總筆數:", rows.length);
console.log("欄位:", Object.keys(rows[0]));

// 只列出「值的種類很少」的欄位，例如類型、狀態、行政區。
// 說明、地址這類自由文字欄位不會被印出來。
for (const col of Object.keys(rows[0])) {
  const counts = {};
  for (const r of rows) counts[r[col]] = (counts[r[col]] ?? 0) + 1;
  const kinds = Object.keys(counts).length;
  if (kinds <= 15) {
    console.log(`\n[${col}] 共 ${kinds} 種值：`, counts);
  } else {
    console.log(`\n[${col}] 有 ${kinds} 種不同的值（自由文字或座標，不展開）`);
  }
}
