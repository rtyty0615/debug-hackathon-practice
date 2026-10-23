import { useEffect } from "react";
import Badge from "./Badge";
import { FEATURES } from "../lib/score";
import {
  ASSUMPTIONS,
  LIMITATIONS,
  OTHER_SOURCES,
  PRIVACY,
} from "../lib/sources";

export default function AboutModal({ onClose }) {
  // 按 Esc 關閉
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sources = [...FEATURES, ...OTHER_SOURCES];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>資料說明</h2>
          <button onClick={onClose}>關閉</button>
        </div>

        <p>
          「鼠患風險地圖」把歷史通報與人孔分布整合到 500
          公尺網格，算出相對風險分數。每份資料都標示是真實或模擬。
        </p>

        <h3>資料來源</h3>
        <ul>
          {sources.map((s) => (
            <li key={s.label}>
              <strong>{s.label}</strong> <Badge kind={s.provenance} />
              <div>{s.source}</div>
              <div className="muted">{s.processing}</div>
            </li>
          ))}
        </ul>

        <h3>模型假設</h3>
        <ul>
          {ASSUMPTIONS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>

        <h3>已知限制</h3>
        <ul>
          {LIMITATIONS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>

        <h3>個資與授權</h3>
        <ul>
          {PRIVACY.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
