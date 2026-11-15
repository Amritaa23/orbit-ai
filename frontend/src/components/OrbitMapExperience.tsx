
import { useMemo } from "react";
import { BookOpen, Network, Sparkles, ArrowUpRight } from "lucide-react";
import type { Paper } from "../types";

type GraphNode = {
  id: string;
  label: string;
  type: string;
};

type GraphEdge = {
  source: string;
  target: string;
  type: string;
};

type GraphData = {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
};

type Props = {
  query: string;
  graph: GraphData | null;
  papers: Paper[];
  onSelect: (paper: Paper) => void;
};

const ignoredConcepts = new Set([
  "using", "based", "with", "from", "this", "that", "these", "those",
  "their", "which", "where", "when", "what", "how", "why", "into",
  "over", "under", "between", "through", "also", "more", "less",
  "paper", "study", "result", "results", "method", "methods",
  "approach", "based", "proposed", "show", "shows", "using"
]);

function cleanConcept(value: string) {
  return value
    .replace(/^keyword_/, "")
    .replace(/_/g, " ")
    .trim();
}

export default function OrbitMapExperience({
  query,
  graph,
  papers,
  onSelect
}: Props) {
  const clusters = useMemo(() => {
    const nodes = graph?.nodes ?? [];
    const edges = graph?.edges ?? [];

    const paperNodeIds = new Set(
      nodes.filter(node => node.type === "paper").map(node => node.id)
    );

    const conceptLabels = new Map(
      nodes
        .filter(node => node.type === "concept")
        .map(node => [node.id, cleanConcept(node.label)])
    );

    const conceptPapers = new Map<string, Set<string>>();

    edges.forEach(edge => {
      if (!paperNodeIds.has(edge.source)) return;
      if (edge.type !== "discusses") return;

      const label = conceptLabels.get(edge.target);
      if (!label) return;

      const normalized = label.toLowerCase();

      if (
        normalized.length < 4 ||
        ignoredConcepts.has(normalized) ||
        /^\d+$/.test(normalized)
      ) return;

      if (!conceptPapers.has(label)) {
        conceptPapers.set(label, new Set());
      }

      conceptPapers.get(label)?.add(edge.source);
    });

    const paperLookup = new Map(
      papers.map(paper => [`paper_${paper.id}`, paper])
    );

    return Array.from(conceptPapers.entries())
      .filter(([, ids]) => ids.size >= 2)
      .map(([concept, ids]) => ({
        concept,
        papers: Array.from(ids)
          .map(id => paperLookup.get(id))
          .filter((paper): paper is Paper => Boolean(paper))
      }))
      .filter(cluster => cluster.papers.length >= 2)
      .sort((a, b) => b.papers.length - a.papers.length)
      .slice(0, 5);
  }, [graph, papers]);

  const groupedPaperIds = new Set(
    clusters.flatMap(cluster => cluster.papers.map(paper => paper.id))
  );

  const otherPapers = papers.filter(paper => !groupedPaperIds.has(paper.id));

  if (!papers.length) {
    return (
      <section className="orbit-map-empty">
        <Network size={30} />
        <h3>Your research map is waiting</h3>
        <p>Search for a topic to discover how research papers connect through shared concepts.</p>
      </section>
    );
  }

  return (
    <section className="orbit-map-experience">
      <div className="orbit-map-intro">
        <div>
          <span className="eyebrow">YOUR RESEARCH LANDSCAPE</span>
          <h2>Explore the connections in <span>your topic.</span></h2>
          <p>
            ORBIT groups papers when their titles and abstracts share concepts.
            Select any paper to read more.
          </p>
        </div>
        <div className="orbit-map-question">
          <Sparkles size={16} />
          <span>{query}</span>
        </div>
      </div>

      <div className="orbit-map-overview">
        <div>
          <strong>{papers.length}</strong>
          <span>papers discovered</span>
        </div>
        <div>
          <strong>{clusters.length}</strong>
          <span>shared-concept groups</span>
        </div>
        <div>
          <strong>{clusters.reduce((total, cluster) => total + cluster.papers.length, 0)}</strong>
          <span>grouped paper appearances</span>
        </div>
      </div>

      {clusters.length > 0 ? (
        <div className="orbit-map-clusters">
          {clusters.map((cluster, index) => (
            <article className="orbit-map-cluster" key={cluster.concept}>
              <div className="orbit-map-cluster-heading">
                <div className="orbit-map-cluster-icon">
                  <Network size={17} />
                </div>
                <div>
                  <span>SHARED CONCEPT {String(index + 1).padStart(2, "0")}</span>
                  <h3>{cluster.concept}</h3>
                </div>
                <span className="orbit-map-count">
                  {cluster.papers.length} papers
                </span>
              </div>

              <p className="orbit-map-explanation">
                These papers are connected because ORBIT found this concept in their research text.
              </p>

              <div className="orbit-map-paper-list">
                {cluster.papers.map(paper => (
                  <button
                    type="button"
                    className="orbit-map-paper"
                    key={paper.id}
                    onClick={() => onSelect(paper)}
                  >
                    <BookOpen size={17} />
                    <span>{paper.title}</span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="orbit-map-no-clusters">
          <Sparkles size={22} />
          <h3>Your papers are ready to explore</h3>
          <p>
            ORBIT found papers for this topic, but no repeated concepts were
            strong enough to form a shared group. You can still open each paper below.
          </p>
        </div>
      )}

      {otherPapers.length > 0 && (
        <div className="orbit-map-other">
          <div className="orbit-map-other-heading">
            <div>
              <span className="eyebrow">MORE TO EXPLORE</span>
              <h3>Other papers in your research orbit</h3>
            </div>
            <span>{otherPapers.length} papers</span>
          </div>

          <div className="orbit-map-paper-list">
            {otherPapers.map(paper => (
              <button
                type="button"
                className="orbit-map-paper"
                key={paper.id}
                onClick={() => onSelect(paper)}
              >
                <BookOpen size={17} />
                <span>{paper.title}</span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="orbit-map-disclaimer">
        Connections represent overlapping extracted concepts, not verified citations or proof that one paper influenced another.
      </p>
    </section>
  );
}
