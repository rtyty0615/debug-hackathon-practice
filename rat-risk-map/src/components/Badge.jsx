import { PROVENANCE } from "../lib/sources";

export default function Badge({ kind }) {
  const p = PROVENANCE[kind];
  if (!p) return null;
  return (
    <span className="badge" style={{ color: p.color, background: p.bg }}>
      {p.label}
    </span>
  );
}
