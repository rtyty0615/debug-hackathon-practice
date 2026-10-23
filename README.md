# Taipei Rat Infestation Risk Map｜台北市鼠患風險地圖

**A data-driven tool for identifying and prioritizing potential rat infestation hotspots in Taipei.**  
**整合公開通報與下水道人孔資料，協助辨識台北市潛在鼠患熱點並制定優先處理順序。**

A project submitted for **Taipei City Government's “City Affairs Hackathon” (市政松), Challenge #3**.  
本專案為台北市「市政松」題目 #3 的參賽作品。

**Live Demo｜線上展示：** https://rat-risk-map-taipei.vercel.app/

The project combines historical rat sighting reports and storm drain manhole locations into a 500-meter grid. It calculates a relative risk score for each cell, allowing users to adjust feature weights, inspect score contributions, and identify priority areas for intervention.

本專案將歷史鼠蹤通報與雨水下水道人孔位置整合至 500 公尺網格，計算各網格的相對風險分數。使用者可以調整特徵權重、查看各項指標對分數的貢獻，並找出應優先處理的區域。

## Features｜功能

- **Risk Score Map｜風險分數地圖**  
  Calculate risk scores using weighted sighting reports and manhole counts. Switch between the combined risk score, report count, and manhole count layers.  
  根據通報數與人孔數及其權重計算風險分數，並可切換風險分數、通報數與人孔數圖層。

- **Adjustable Weights｜可調整權重**  
  Use sliders to adjust feature weights and see the map and rankings update in real time.  
  透過滑桿調整各項特徵的權重，地圖與排名即時更新。

- **Cell-Level Explanations｜網格分數解析**  
  Click any grid cell to inspect its score and the contribution of each feature.  
  點選任一網格，即可查看分數及各項特徵的貢獻。

- **Top 10 Priority Areas｜前 10 名優先處理區域**  
  View the ten highest-ranked grid cells and click an entry to zoom to its location on the map.  
  查看風險分數最高的前 10 個網格，點選清單項目即可定位至地圖上的對應區域。

- **Data Transparency Panel｜資料透明度面板**  
  Review each dataset's source, processing method, whether the data is real or simulated, assumptions, and limitations.  
  查看各份資料的來源、處理方式、真實或模擬資料的標示，以及相關假設與限制。

## Data Sources｜資料來源

### Real Data｜真實資料

**1. Rat Radar — Public Rat Sighting Reports｜見鼠地圖公開鼠蹤通報**

Source｜來源：[Rat Radar CSV Export](https://ratdar.taipei/reports/export)

- Retain only reviewed rat sighting reports located within Taipei City.
- Aggregate reports into 500-meter grid cells.
- Exclude individual report descriptions and photographs from the processed public dataset.

- 僅保留已審核且位於台北市範圍內的鼠蹤通報。
- 將通報聚合至 500 公尺網格。
- 不在處理後的公開資料中保留單筆通報說明或照片。

**2. Taipei City Storm Drain Manholes｜台北市雨水下水道人孔**

Source｜來源: [data.taipei](https://data.taipei/)

- Retain manholes marked as active and in normal condition.
- This filtering follows clarification provided by the city government: dummy manholes have no actual openings, while covered manholes cannot be opened.

- 僅保留標示為使用中且狀態正常的人孔。
- 依市府電話說明進行篩選：虛人孔沒有實際開口，覆蓋人孔則無法開啟。

### Simulated Data｜模擬資料

**No simulated data is currently used.** Additional factors, including restaurant density, waste collection gaps, and breeding-season coefficients, are under consideration. If introduced, simulated data will be explicitly labeled in both the interface and this README.

**目前未使用任何模擬資料。** 餐飲密度、清運落差與繁殖期係數等額外特徵仍在規劃中。若未來加入模擬資料，將在介面與本文件中明確標示。

## Model Assumptions｜模型假設

- **Equal default weights｜預設權重相同**  
  The default 50% weight for each feature is an initial modeling assumption, not an empirically validated parameter.  
  預設通報與人孔各占 50%，僅為初始模型假設，尚無實證依據。

- **95th-percentile normalization｜第 95 百分位縮放**  
  Each feature is normalized to a 0–1 scale using its 95th percentile. Values above that threshold are capped at 1.  
  各項特徵以第 95 百分位進行 0–1 縮放，超過該門檻的值統一設為 1。

- **Relative risk, not absolute prediction｜相對風險，而非絕對預測**  
  Scores indicate relative rankings across grid cells. They do not estimate actual rat populations or the probability of an infestation.  
  分數用於比較不同網格之間的相對排序，不代表實際老鼠數量，也不代表鼠患發生機率。

## Known Limitations｜已知限制

- **Reporting bias｜通報偏差**  
  Reports reflect where people are willing and able to report rat sightings, not necessarily where rats are most abundant.  
  通報反映的是民眾願意且能夠通報的地點，不一定是老鼠數量最多的地方。

- **Limited time coverage｜時間範圍有限**  
  The sighting dataset covers only May through September 2026, which is insufficient to establish seasonal patterns.  
  鼠蹤通報資料僅涵蓋 2026 年 5 月至 9 月，尚不足以判斷季節性規律。

- **Weak correlation｜相關性有限**  
  The correlation between sighting report counts and manhole counts is approximately 0.30. Manhole density alone is therefore insufficient to represent rat infestation risk.  
  通報數與人孔數的相關係數約為 0.30，因此不能單靠人孔密度判斷鼠患風險。

- **Proxy variable｜替代指標的限制**  
  Storm drain manholes are used as a proxy for drainage infrastructure density; they are not a direct measurement of rat populations or underground rat activity.  
  雨水下水道人孔僅作為管道設施密度的替代指標，並非老鼠數量或地下鼠類活動的直接測量。

- **Approximate location labels｜位置標籤僅供參考**  
  Each cell is labeled using the administrative neighborhood (里) occurring most frequently within it. A total of 76 cells cross multiple administrative districts, so labels may not fully represent the cell's geographic coverage.  
  每格以格內出現次數最多的行政里作為位置標籤。共有 76 格跨越多個行政區，因此標籤無法完整代表該網格涵蓋的地理範圍。

## Privacy｜隱私保護

- The public website exposes aggregated statistics at the 500-meter grid level, not individual report locations, descriptions, or photographs.
- No real personal information is used in this project.
- Rat Radar is a third-party dataset. Its licensing and authorization should be verified before formal or commercial use.

- 公開網頁僅呈現 500 公尺網格層級的彙總統計，不公開單筆通報位置、說明或照片。
- 本專案未使用任何真實個人資料。
- 見鼠地圖為第三方民間資料，正式或商業使用前應確認資料授權。

## Reproducing the Data Pipeline｜重現資料處理流程

Raw source data is not included in the repository. Download the datasets and place them in `data/raw/` before running the pipeline.

原始資料不包含在版本庫中。請先下載資料，並放入 `data/raw/` 目錄。

| File｜檔案     | Source｜來源                                                                    |
| -------------- | ------------------------------------------------------------------------------- |
| `ratdar.csv`   | [Rat Radar CSV Export](https://ratdar.taipei/reports/export)                    |
| `manholes.csv` | data.taipei — Taipei City Storm Drain Manhole Dataset｜台北市雨水下水道人孔資料 |

Run the following commands from the project root｜在專案根目錄執行：

```bash
npm install
npm run data
npm run dev
```

The data pipeline cleans the source datasets, constructs the grid, processes manhole locations, and generates location labels. The resulting aggregated GeoJSON file is written to `public/data/grid.geojson`.

資料處理流程會清理原始資料、建立網格、處理人孔位置並產生位置標籤，最後輸出彙總後的 GeoJSON 檔案至 `public/data/grid.geojson`。

## Tech Stack｜技術架構

- **Vite** — Development server and build tooling｜開發伺服器與建置工具
- **React** — User interface｜使用者介面
- **Leaflet** — Interactive map｜互動式地圖
- **Turf.js** — Geospatial processing｜地理空間資料處理
- **proj4** — Coordinate transformation from TWD97 to geographic coordinates｜TWD97 座標轉換為地理經緯度

The project has no backend. Data processing scripts run locally, and the frontend reads the pre-aggregated GeoJSON file directly.

本專案沒有後端服務。資料處理腳本在本機執行，前端直接讀取預先彙總的 GeoJSON 檔案。

## Project Structure｜專案結構

```text
scripts/             Data cleaning and grid processing scripts
                     資料清理與網格處理腳本
  01                 Data cleaning｜資料清理
  02                 Grid construction｜建立網格
  03                 Manhole processing｜人孔處理
  04                 Location labeling｜位置標籤

public/data/         Aggregated data served to the frontend
                     提供給前端的彙總資料

src/lib/             Risk scoring and data source configuration
                     風險分數計算與資料來源設定

src/components/      Data source badges and data information panel
                     資料來源標示與資料說明面板
```

## Disclaimer｜使用聲明

This map is an exploratory decision-support tool, not an official diagnosis of rat infestation or a substitute for field inspection. Scores depend on the selected weights, data coverage, and modeling assumptions. Results should be interpreted as relative indicators for prioritizing further investigation.

本地圖為探索性的決策輔助工具，並非官方鼠患診斷，也不能取代現場勘查。分數會受到權重設定、資料涵蓋範圍與模型假設影響，應視為安排後續調查優先順序的參考指標。
