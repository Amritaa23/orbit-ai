import { ExternalLink, X } from "lucide-react";
import type { Paper } from "../types";

export default function DetailPanel({ paper, onClose }: { paper: Paper | null; onClose: () => void }) {
  if (!paper) return null;
  const authors = Array.isArray(paper.authors) ? paper.authors.join(", ") : paper.authors;
  const categories = Array.isArray(paper.categories) ? paper.categories.join(", ") : paper.categories;
  return <div className="detail-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <aside className="detail-panel">
      <div className="detail-head"><span className="eyebrow">PAPER DETAILS</span><button className="icon-button" onClick={onClose} aria-label="Close details"><X size={18}/></button></div>
      <h2>{paper.title}</h2>
      {paper.similarity !== undefined && <span className="match-pill">{Math.round(paper.similarity * 100)}% relevance match</span>}
      <div className="detail-section"><label>ABSTRACT</label><p>{paper.abstract || "No abstract was returned by the backend for this paper."}</p></div>
      <div className="detail-section"><label>AUTHORS</label><p>{authors || "Not provided"}</p></div>
      <div className="detail-section"><label>CATEGORIES</label><p>{categories || "Not provided"}</p></div>
      <div className="detail-section"><label>PUBLICATION</label><p>{paper.published || "Not provided"}</p></div>
      <div className="detail-section"><label>PAPER ID</label><p className="mono">{paper.id || "Not provided"}</p></div>
      {paper.url && <a className="primary-link" href={paper.url} target="_blank" rel="noreferrer">Read original paper <ExternalLink size={16}/></a>}
    </aside>
  </div>;
}