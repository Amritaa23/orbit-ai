import { useMemo, useState } from "react";
import type { Paper } from "../types";

type Props = { papers: Paper[]; query: string; selected: Paper | null; onSelect: (p: Paper) => void };

export default function OrbitCanvas({ papers, query, selected, onSelect }: Props) {
  const [paused, setPaused] = useState(false);
  const nodes = useMemo(() => papers.slice(0, 12).map((paper, i) => {
    const ring = Math.floor(i / 4);
    const within = i % 4;
    const angle = (within / 4) * Math.PI * 2 + ring * 0.42;
    const radiusX = 23 + ring * 13;
    const radiusY = 17 + ring * 9;
    return {
      paper,
      x: 50 + Math.cos(angle) * radiusX,
      y: 50 + Math.sin(angle) * radiusY,
      ring,
      delay: `${-(i * 1.7)}s`,
      score: Math.round((paper.similarity ?? paper.score ?? 0) * 100)
    };
  }), [papers]);

  if (!papers.length) return <div className="orbit-empty">Your research orbit will appear here after a search.</div>;

  return <section className={`orbit-stage ${paused ? "is-paused" : ""}`}>
    <div className="orbit-toolbar">
      <div><span className="eyebrow">ORBIT MAP</span><p>Explore the papers around your question</p></div>
      <button className="quiet-button" onClick={() => setPaused(v => !v)}>{paused ? "Resume motion" : "Pause motion"}</button>
    </div>
    <div className="orbit-visual" aria-label="Interactive orbital map of research papers">
      <div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-ring ring-three" />
      <div className="orbit-cross cross-a" /><div className="orbit-cross cross-b" />
      <div className="orbit-core"><span className="core-glow" /><span className="core-label">YOUR TOPIC</span><strong>{query || "Research"}</strong><small>{papers.length} papers discovered</small></div>
      {nodes.map(({ paper, x, y, ring, delay, score }, i) => (
        <button
          key={paper.id || `${paper.title}-${i}`}
          className={`orbit-node ring-node-${ring} ${selected?.id === paper.id ? "selected" : ""}`}
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: delay }}
          onClick={() => onSelect(paper)}
          title={paper.title}
          aria-label={`Open ${paper.title}`}
        >
          <span className="node-dot" /><span className="node-text">{paper.title}</span><span className="node-score">{score ? `${score}% match` : "Open paper"}</span>
        </button>
      ))}
    </div>
    <div className="orbit-legend"><span><i className="legend-dot violet" /> Closest matches</span><span><i className="legend-dot cyan" /> Related research</span><span>Position is a visual relevance guide, not a verified citation link.</span></div>
  </section>;
}