// 之後要加新特徵（餐飲、清運落差…），在這裡多加一筆，
// 並確保 grid.geojson 的每格都有對應欄位；徽章與資料說明會自動更新。
export const FEATURES = [
  {
    key: "reports",
    label: "歷史通報",
    defaultWeight: 50,
    provenance: "real",
    source: "見鼠地圖 Rat Radar 公開 CSV",
    processing:
      "只保留已審核、位於臺北市的「鼠蹤」通報（約 4.5 個月，892 筆）；聚合到 500 公尺格，不保留說明與照片。",
  },
  {
    key: "manholes",
    label: "人孔（管道）",
    defaultWeight: 50,
    provenance: "real",
    source: "臺北市雨水下水道人孔資料（data.taipei）",
    processing:
      "只保留使用中的「正常人孔」（10,955 個，依市府電話說明）；作為地下管道密度的替代指標。",
  },
];

// 把每個特徵縮放到 0–1：除以該特徵的「第95百分位」，超過的算 1。
// 這樣少數極端的格子不會把其他格子都壓得很淡。
export function makeNormalizers(features, grid) {
  const result = {};
  for (const { key } of features) {
    const nonZero = grid.features
      .map((f) => f.properties[key])
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    const p95 = nonZero.length ? nonZero[Math.floor(nonZero.length * 0.95)] : 1;
    result[key] = (v) => Math.min(v / p95, 1);
  }
  return result;
}

// 風險分數 = 各特徵（0–1）依權重平均，再乘以 100
// 權重除以總和，所以只有「相對比例」有影響，不用在意總和是不是 100。
export function scoreCell(props, features, weights, norm) {
  let sum = 0;
  let total = 0;
  for (const { key } of features) {
    const w = weights[key] ?? 0;
    sum += w * norm[key](props[key]);
    total += w;
  }
  return total === 0 ? 0 : (sum / total) * 100;
}

// 把一格的分數拆解成各特徵的貢獻（加起來等於風險分數）
export function breakdown(props, features, weights, norm) {
  const total = features.reduce((s, f) => s + (weights[f.key] ?? 0), 0);
  return features.map(({ key, label }) => {
    const w = weights[key] ?? 0;
    return {
      key,
      label,
      raw: props[key],
      points: total === 0 ? 0 : ((w * norm[key](props[key])) / total) * 100,
    };
  });
}
