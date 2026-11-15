import { Bookmark, ExternalLink, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Paper } from "../types";

type Props = { paper: Paper; index: number; onOpen: (p: Paper) => void; onFeedback: (p: Paper, kind: "like"|"dislike"|"save") => void; };
export default function PaperCard({ paper, index, onOpen, onFeedback }: Props) {
  const score = paper.similarity ?? 0;
  const percent = Math.max(0, Math.min(100, Math.round(score * 100)));
  const categories = Array.isArray(paper.categories) ? paper.categories : String(paper.categories || "").split(",");
  return <article className="paper-card">
    <div className="paper-topline"><span className="rank">#{String(index + 1).padStart(2, "0")}</span><span className="match-pill">{percent ? `${percent}% relevance` : "Research paper"}</span></div>
    <button className="paper-title" onClick={() => onOpen(paper)}>{paper.title}</button>
    <p className="paper-abstract">{paper.abstract || "Open this paper to inspect its available abstract and metadata."}</p>
    <div className="paper-meta">
      {categories.filter(Boolean).slice(0, 3).map(c => <span className="tag" key={c.trim()}>{c.trim()}</span>)}
      {paper.published && <span className="meta-text">{paper.published}</span>}
    </div>
    <div className="paper-actions">
      <button onClick={() => onFeedback(paper, "like")} aria-label="More like this"><ThumbsUp size={15}/> Helpful</button>
      <button onClick={() => onFeedback(paper, "dislike")} aria-label="Less like this"><ThumbsDown size={15}/> Less like this</button>
      <button onClick={() => onFeedback(paper, "save")} aria-label="Save paper"><Bookmark size={15}/> Save</button>
      {paper.url && <a href={paper.url} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Source</a>}
    </div>
  </article>;
}
