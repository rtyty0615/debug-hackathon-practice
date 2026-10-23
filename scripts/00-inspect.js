import fs from "node:fs";
import { parse } from "csv-parse/sync";

const args = process.argv.slice(2);
const showSample = args.includes("--sample");
const [file = "data/raw/ratdar.csv", encoding = "utf-8"] = args.filter(
  (a) => !a.startsWith("--"),
);

const text = new TextDecoder(encoding).decode(fs.readFileSync(file));
const rows = parse(text, { columns: true, skip_empty_lines: true, bom: true });

console.log("總筆數:", rows.length);
console.log("欄位:", Object.keys(rows[0]));
if (showSample) console.log("\n第一筆範例:", rows[0]);

// 只列出「值的種類很少」的欄位，例如類型、狀態、行政區。
for (const col of Object.keys(rows[0])) {
  const counts = {};
  for (const r of rows) counts[r[col]] = (counts[r[col]] ?? 0) + 1;
  const kinds = Object.keys(counts).length;
  if (kinds <= 15) {
    console.log(`\n[${col}] 共 ${kinds} 種值：`, counts);
  } else {
    console.log(`\n[${col}] 有 ${kinds} 種不同的值（不展開）`);
  }
}
