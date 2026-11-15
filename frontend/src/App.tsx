
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Atom, ArrowRight, Bookmark, Check, ChevronDown, Compass,
  FlaskConical, LoaderCircle, Orbit, Search, Sparkles, Stars,
  Telescope, X, Trash2, ThumbsUp, ThumbsDown,
  RefreshCw, History, SlidersHorizontal
} from "lucide-react";

import OrbitCanvas from "./components/OrbitCanvas";
import HomeExperience from "./components/HomeExperience";
import PaperCard from "./components/PaperCard";
import DetailPanel from "./components/DetailPanel";
import OrbitMapExperience from "./components/OrbitMapExperience";
import ResearchUniverse from "./components/ResearchUniverse";

import {
  comparePapers,
  getGraph,
  getMemory,
  getPreferences,
  healthCheck,
  removeSavedPaper,
  saveMemory,
  searchPapers,
  sendFeedback,
  serendipitySearch
} from "./api";

import type { Paper, FeatureTab } from "./types";

const suggestions = [
  "How can AI improve medical diagnosis?",
  "Recent advances in climate modelling",
  "Explainable machine learning methods",
  "Human-computer interaction and accessibility"
];

const modes = ["Precise", "Balanced", "Explore"] as const;

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
  query?: string;
  total_nodes?: number;
  total_edges?: number;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
};

type MemoryData = {
  saved_papers?: Array<Record<string, unknown>>;
  history?: Array<Record<string, unknown>>;
};

type EvidenceData = {
  papers?: Array<Record<string, unknown>>;
  comparisons?: Array<Record<string, unknown>>;
  shared_concepts?: string[];
  unique_concepts?: Record<string, string[]>;
};

function displayCategories(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);

  if (typeof value === "string") {
    return value.split(",").map(v => v.trim()).filter(Boolean);
  }

  return [];
}

export default function App() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selected, setSelected] = useState<Paper | null>(null);

  const [tab, setTab] = useState<FeatureTab>("discover");
  const [mode, setMode] = useState<(typeof modes)[number]>("Balanced");
  const [category, setCategory] = useState("All");
  const [minRelevance, setMinRelevance] = useState(0);
  const [personalized, setPersonalized] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [apiStatus, setApiStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<EvidenceData | null>(null);

  const [graph, setGraph] = useState<GraphData | null>(null);
  const [serendipityResults, setSerendipityResults] = useState<Paper[]>([]);

  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [preferences, setPreferences] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    healthCheck()
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));
  }, []);

  const visiblePapers = useMemo(() => {
    return papers.filter(p => {
      const cats = displayCategories(p.categories);

      return (
        (category === "All" || cats.includes(category)) &&
        (p.similarity ?? 0) >= minRelevance / 100
      );
    });
  }, [papers, category, minRelevance]);

  // SEMANTIC SEARCH + ORBIT MAP DATA

  async function runSearch(text = query) {
    const clean = text.trim();

    if (!clean) {
      setError("Enter a research question or topic to begin exploring.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    setSelected(null);
    setCompareIds([]);
    setCompareResult(null);

    setQuery(clean);
    setActiveQuery(clean);
    setTab("discover");

    try {
      setGraph(null);

      const [searchResult, graphResult] = await Promise.allSettled([
        searchPapers(clean, {
          topK: 12,
          category,
          personalized
        }),
        getGraph(clean)
      ]);

      if (searchResult.status === "rejected") {
        throw searchResult.reason;
      }

      const results = searchResult.value;
      setPapers(results);

      if (graphResult.status === "fulfilled") {
        setGraph(graphResult.value as GraphData);
      } else {
        setGraph(null);
        console.warn("OrbitMap could not refresh:", graphResult.reason);
      }

      if (!results.length) {
        setNotice(
          "No papers matched this search. Try a broader research question."
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Search failed. Check that the ORBIT API is running."
      );

      setPapers([]);
      setGraph(null);
    } finally {
      setLoading(false);
    }
  }

  // SERENDIPITY DISCOVERY

  async function runSerendipity() {
    if (!activeQuery.trim()) {
      setError("Search for a research topic first.");
      setTab("discover");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const results = await serendipitySearch(
        activeQuery,
        mode.toLowerCase() as "precise" | "balanced" | "explore",
        10
      );

      setSerendipityResults(results);

      if (!results.length) {
        setNotice("No discoveries found. Try another discovery mode.");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Serendipity search failed."
      );
    } finally {
      setLoading(false);
    }
  }

  // FEEDBACK AND RESEARCH MEMORY

  async function feedback(
    paper: Paper,
    kind: "like" | "dislike" | "save"
  ) {
    try {
      if (kind === "save") {
        await saveMemory(paper.id);
        setNotice("Paper saved to Research Memory.");

        if (tab === "memory") {
          await loadMemory();
        }
      } else {
        await sendFeedback(paper.id, kind);

        setNotice(
          kind === "like"
            ? "Preference updated. ORBIT will learn from this feedback."
            : "Feedback recorded. ORBIT will adjust your preferences."
        );

        if (tab === "preferences") {
          await loadPreferences();
        }
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not record your feedback."
      );
    }
  }

  async function loadMemory() {
    setMemory(await getMemory() as MemoryData);
  }

  async function loadPreferences() {
    setPreferences(await getPreferences());
  }

  async function loadGraph() {
    if (!activeQuery.trim()) {
      setGraph(null);
      return;
    }

    setGraph(await getGraph(activeQuery) as GraphData);
  }

  async function openTab(next: FeatureTab) {
    setTab(next);
    setError("");
    setNotice("");

    try {
      if (next === "memory") await loadMemory();
      if (next === "preferences") await loadPreferences();
      if (next === "orbitmap") await loadGraph();
      if (next === "serendipity" && activeQuery) await runSerendipity();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load this ORBIT feature."
      );
    }
  }

  // EVIDENCE LAB

  async function doCompare() {
    if (compareIds.length < 2) {
      setError("Select at least two papers to compare.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await comparePapers(compareIds);

      setCompareResult(result as EvidenceData);
      setTab("evidence");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Evidence comparison failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleCompare(paper: Paper) {
    setCompareIds(old => {
      if (old.includes(paper.id)) {
        return old.filter(id => id !== paper.id);
      }

      if (old.length >= 3) {
        setNotice("EvidenceLab supports a maximum of three papers.");
        return old;
      }

      return [...old, paper.id];
    });
  }

  // DELETE SAVED PAPER

  async function deleteSavedPaper(paperId: string) {
    try {
      await removeSavedPaper(paperId);

      setNotice("Paper removed from Research Memory.");
      await loadMemory();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not remove saved paper."
      );
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void runSearch();
  }

  return (
    <div className="app-shell">

      {/* HEADER */}

      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={e => {
            e.preventDefault();
            void openTab("discover");
          }}
        >
          <span className="brand-mark">
            <Orbit size={22} />
          </span>

          <span>
            ORBIT<span className="brand-ai"> AI</span>
            <small>RESEARCH DISCOVERY</small>
          </span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={tab === "discover" ? "active" : ""}
            onClick={() => void openTab("discover")}
          >
            Discover
          </button>

          <button
            className={tab === "orbitmap" ? "active" : ""}
            onClick={() => void openTab("orbitmap")}
          >
            OrbitMap
          </button>

          <button
            className={tab === "evidence" ? "active" : ""}
            onClick={() => void openTab("evidence")}
          >
            EvidenceLab
          </button>

          <button
            className={tab === "serendipity" ? "active" : ""}
            onClick={() => void openTab("serendipity")}
          >
            Serendipity
          </button>

          <button
            className={tab === "memory" ? "active" : ""}
            onClick={() => void openTab("memory")}
          >
            Memory
          </button>
        </nav>

        <div className="topbar-right">
          <span className={`api-indicator ${apiStatus}`}>
            <i />
            {apiStatus === "online"
              ? "Engine connected"
              : apiStatus === "offline"
                ? "Engine offline"
                : "Connecting"}
          </span>

          <button
            className="avatar-button"
            onClick={() => void openTab("preferences")}
            aria-label="Preferences"
          >
            A
          </button>
        </div>
      </header>

      <main>

        {/* DISCOVER */}

        {tab === "discover" && (
          <>
            <section className={`hero ${papers.length ? "hero-compact" : ""}`}>
              <div className="hero-orbit-art">
                <div className="art-ring art-ring-a" />
                <div className="art-ring art-ring-b" />
                <div className="art-ring art-ring-c" />

                <span className="art-star star-a" />
                <span className="art-star star-b" />
                <span className="art-star star-c" />

                <div className="art-core">
                  <Atom size={30} />
                </div>
              </div>

              <div className="hero-content">
                <div className="eyebrow hero-eyebrow">
                  <Sparkles size={14} />
                  A NEW WAY TO EXPLORE KNOWLEDGE
                </div>

                <h1>
                  Curiosity has
                  <br />
                  <em>no boundaries.</em>
                </h1>

                <p className="hero-copy">
                  Search beyond keywords. Discover the ideas, papers and
                  connections hiding between the lines.
                </p>

                <form className="search-box" onSubmit={submit}>
                  <Search size={20} />

                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="What would you like to discover?"
                    aria-label="Research search query"
                  />

                  {query && (
                    <button
                      type="button"
                      className="clear-query"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}

                  <button
                    className="search-submit"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : (
                      <ArrowRight size={18} />
                    )}

                    <span>{loading ? "Searching" : "Explore"}</span>
                  </button>
                </form>

                <div className="suggestions">
                  <span>TRY EXPLORING</span>

                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setQuery(s);
                        void runSearch(s);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {!activeQuery && <HomeExperience />}

            {/* RESEARCH UNIVERSE */}
            {!activeQuery && <ResearchUniverse />}

            <section className="discovery-controls">
              <div className="control-group">
                <span className="control-label">DISCOVERY STYLE</span>

                <div className="segmented">
                  {modes.map(m => (
                    <button
                      key={m}
                      className={mode === m ? "selected" : ""}
                      onClick={() => setMode(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-group">
                <label className="control-label" htmlFor="category">
                  RESEARCH AREA
                </label>

                <div className="select-wrap">
                  <select
                    id="category"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    {[
                      "All", "cs.AI", "cs.CL", "cs.LG", "cs.CV",
                      "cs.IR", "cs.SE", "cs.NE", "cs.RO", "stat.ML"
                    ].map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>

                  <ChevronDown size={15} />
                </div>
              </div>

              <div className="control-group relevance-control">
                <label className="control-label" htmlFor="relevance">
                  MINIMUM RELEVANCE <b>{minRelevance}%</b>
                </label>

                <input
                  id="relevance"
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={minRelevance}
                  onChange={e => setMinRelevance(Number(e.target.value))}
                />
              </div>

              <label className="personalize-toggle">
                <input
                  type="checkbox"
                  checked={personalized}
                  onChange={e => setPersonalized(e.target.checked)}
                />
                <span className="toggle-ui" />
                <span>Personalize results</span>
              </label>
            </section>

            {loading && (
              <div className="loading-line">
                <span />
                <span />
                <span />
                Finding meaningful connections in your research universe...
              </div>
            )}

            {error && <div className="alert error-alert">{error}</div>}

            {notice && (
              <div className="alert notice-alert">
                <Check size={16} />
                {notice}
              </div>
            )}

            {activeQuery && !loading && (
              <section className="results-section">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">YOUR DISCOVERY</span>

                    <h2>
                      Research orbit <span>for "{activeQuery}"</span>
                    </h2>

                    <p>
                      {visiblePapers.length} relevant papers in your
                      discovery space
                    </p>
                  </div>

                  <button
                    className="quiet-button"
                    onClick={() => void runSearch(activeQuery)}
                  >
                    <RefreshCw size={14} />
                    Refresh search
                  </button>
                </div>

                <div className="results-layout">
                  <div className="results-main">
                    <div className="result-list-head">
                      <span>RELEVANT PAPERS</span>
                      <span>{visiblePapers.length} RESULTS</span>
                    </div>

                    {visiblePapers.map((p, i) => (
                      <div className="paper-wrap" key={p.id || p.title}>
                        <PaperCard
                          paper={p}
                          index={i}
                          onOpen={setSelected}
                          onFeedback={feedback}
                        />

                        <button
                          className={`compare-check ${
                            compareIds.includes(p.id) ? "checked" : ""
                          }`}
                          onClick={() => toggleCompare(p)}
                          title="Add to EvidenceLab"
                        >
                          {compareIds.includes(p.id) ? (
                            <Check size={14} />
                          ) : (
                            "+"
                          )}

                          <span>
                            {compareIds.includes(p.id)
                              ? "Selected"
                              : "Compare"}
                          </span>
                        </button>
                      </div>
                    ))}

                    {!visiblePapers.length && (
                      <div className="empty-state">
                        <Compass size={28} />
                        <h3>No papers in this orbit yet</h3>
                        <p>
                          Try reducing the relevance threshold or choosing
                          another research area.
                        </p>
                      </div>
                    )}

                    {compareIds.length > 0 && (
                      <button
                        className="compare-launch"
                        onClick={() => void doCompare()}
                      >
                        <FlaskConical size={16} />
                        Compare {compareIds.length} selected paper
                        {compareIds.length > 1 ? "s" : ""}
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>

                  <aside className="orbit-side">
                    <OrbitCanvas
                      papers={visiblePapers}
                      query={activeQuery}
                      selected={selected}
                      onSelect={setSelected}
                    />

                    <div className="side-note">
                      <Stars size={16} />
                      <p>
                        <strong>Follow your curiosity.</strong> Select any
                        paper to inspect it, then explore a new question
                        inspired by what you find.
                      </p>
                    </div>
                  </aside>
                </div>
              </section>
            )}

            {!activeQuery && (
              <section className="below-fold">
                <div>
                  <span className="eyebrow">BUILT FOR THE CURIOUS</span>
                  <h2>
                    One question can lead
                    <br />
                    to a universe of ideas.
                  </h2>
                </div>

                <div className="feature-preview-grid">
                  <div>
                    <Telescope />
                    <h3>Discover by meaning</h3>
                    <p>
                      Find research even when your words do not exactly
                      match a paper's language.
                    </p>
                  </div>

                  <div>
                    <Orbit />
                    <h3>See the bigger picture</h3>
                    <p>
                      Explore relevant papers as an interconnected research
                      space.
                    </p>
                  </div>

                  <div>
                    <FlaskConical />
                    <h3>Investigate evidence</h3>
                    <p>
                      Compare sources and follow the ideas that matter to
                      your question.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* ORBIT MAP */}

        {tab === "orbitmap" && (
          <section className="workspace-page">
            <div className="page-heading">
              <span className="eyebrow">EXPLORE CONNECTIONS</span>

              <h1>
                Orbit<span>Map</span>
              </h1>

              <p>
                Discover how research papers connect through shared concepts.
              </p>
            </div>

            {!activeQuery ? (
              <div className="empty-state">
                <Orbit size={30} />
                <h3>Your map starts with a question</h3>

                <button
                  className="primary-button"
                  onClick={() => void openTab("discover")}
                >
                  Start discovering <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="data-panel">
                <div className="data-panel-head">
                  <Orbit />
                  <strong>Research connections</strong>

                  <button
                    className="quiet-button"
                    onClick={() => void loadGraph()}
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </button>
                </div>

                <OrbitMapExperience
                  query={activeQuery}
                  graph={graph}
                  papers={papers}
                  onSelect={setSelected}
                />
              </div>
            )}
          </section>
        )}

        {/* EVIDENCE LAB */}

        {tab === "evidence" && (
          <section className="workspace-page">
            <div className="page-heading">
              <span className="eyebrow">COMPARE SOURCES</span>

              <h1>
                Evidence<span>Lab</span>
              </h1>

              <p>
                Compare two or three research papers and inspect their
                similarities, shared concepts and differences.
              </p>
            </div>

            {compareResult ? (
              <div className="evidence-workspace">
                <div className="data-stats">
                  <div>
                    <strong>{compareResult.papers?.length ?? 0}</strong>
                    <span>PAPERS COMPARED</span>
                  </div>

                  <div>
                    <strong>{compareResult.comparisons?.length ?? 0}</strong>
                    <span>PAIR COMPARISONS</span>
                  </div>

                  <div>
                    <strong>{compareResult.shared_concepts?.length ?? 0}</strong>
                    <span>SHARED CONCEPTS</span>
                  </div>
                </div>

                <div className="data-panel">
                  <div className="data-panel-head">
                    <FlaskConical />
                    <strong>Compared research papers</strong>
                  </div>

                  <div className="evidence-paper-grid">
                    {(compareResult.papers ?? []).map(paper => (
                      <article
                        className="evidence-paper"
                        key={String(paper.id)}
                      >
                        <span className="eyebrow">RESEARCH PAPER</span>

                        <h3>
                          {String(paper.title ?? "Untitled paper")}
                        </h3>

                        <p>
                          {String(paper.abstract ?? "Abstract unavailable.")}
                        </p>

                        <div className="paper-meta">
                          {displayCategories(paper.categories).map(c => (
                            <span className="tag" key={c}>{c}</span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="data-panel">
                  <div className="data-panel-head">
                    <Orbit />
                    <strong>Semantic similarity</strong>
                  </div>

                  {(compareResult.comparisons ?? []).map((item, index) => {
                    const score = Number(item.similarity ?? 0);

                    return (
                      <div className="similarity-row" key={index}>
                        <span>{String(item.paper_1)}</span>

                        <div className="similarity-track">
                          <i
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, score * 100)
                              )}%`
                            }}
                          />
                        </div>

                        <strong>{(score * 100).toFixed(1)}%</strong>

                        <span>{String(item.paper_2)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="data-panel">
                  <div className="data-panel-head">
                    <Sparkles />
                    <strong>Shared concepts</strong>
                  </div>

                  <div className="concept-list">
                    {(compareResult.shared_concepts ?? []).map(concept => (
                      <span className="tag" key={concept}>{concept}</span>
                    ))}

                    {!compareResult.shared_concepts?.length && (
                      <p>No shared concepts were identified.</p>
                    )}
                  </div>
                </div>

                {compareResult.unique_concepts && (
                  <div className="data-panel">
                    <div className="data-panel-head">
                      <Compass />
                      <strong>Unique concepts by paper</strong>
                    </div>

                    {Object.entries(compareResult.unique_concepts).map(
                      ([id, concepts]) => (
                        <div className="unique-concept-row" key={id}>
                          <strong>{id}</strong>

                          <div className="concept-list">
                            {concepts.map(c => (
                              <span className="tag" key={c}>{c}</span>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                <button
                  className="quiet-button"
                  onClick={() => {
                    setCompareResult(null);
                    setTab("discover");
                  }}
                >
                  Back to discovery
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <FlaskConical size={30} />
                <h3>Build an evidence comparison</h3>

                <p>
                  Run a search, select two or three papers using the Compare
                  controls, then launch EvidenceLab.
                </p>

                <button
                  className="primary-button"
                  onClick={() => void openTab("discover")}
                >
                  Find papers <ArrowRight size={16} />
                </button>
              </div>
            )}
          </section>
        )}

        {/* SERENDIPITY */}

        {tab === "serendipity" && (
          <section className="workspace-page">
            <div className="page-heading">
              <span className="eyebrow">DISCOVER THE UNEXPECTED</span>

              <h1>
                Serendi<span>pity</span>
              </h1>

              <p>
                Find meaningful research connections beyond the obvious
                top matches using diversified discovery.
              </p>
            </div>

            <div className="data-panel">
              <div className="data-panel-head">
                <SlidersHorizontal />
                <strong>Discovery exploration mode</strong>
              </div>

              <div className="segmented serendipity-modes">
                {modes.map(m => (
                  <button
                    key={m}
                    className={mode === m ? "selected" : ""}
                    onClick={() => setMode(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <p className="panel-description">
                {mode === "Precise" &&
                  "Prioritise close matches to your research question."}

                {mode === "Balanced" &&
                  "Balance relevance with a wider range of research."}

                {mode === "Explore" &&
                  "Explore more diverse papers and unexpected connections."}
              </p>

              <p className="panel-description">
                Current research question:{" "}
                <strong>{activeQuery || "No query yet"}</strong>
              </p>

              <button
                className="primary-button"
                disabled={loading || !activeQuery}
                onClick={() => void runSerendipity()}
              >
                {loading ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Sparkles size={16} />
                )}

                Discover papers
              </button>
            </div>

            {error && <div className="alert error-alert">{error}</div>}

            {notice && (
              <div className="alert notice-alert">
                <Check size={16} />
                {notice}
              </div>
            )}

            <div className="serendipity-results">
              {serendipityResults.map((paper, index) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  index={index}
                  onOpen={setSelected}
                  onFeedback={feedback}
                />
              ))}

              {!serendipityResults.length && (
                <div className="empty-state">
                  <Stars size={30} />
                  <h3>There is more to discover</h3>

                  <p>
                    Start with a research question in Discover, then explore
                    using Precise, Balanced or Explore mode.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() => void openTab("discover")}
                  >
                    Start discovering <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* RESEARCH MEMORY */}

        {tab === "memory" && (
          <section className="workspace-page">
            <div className="page-heading">
              <span className="eyebrow">YOUR RESEARCH TRAIL</span>

              <h1>
                Research<span>Memory</span>
              </h1>

              <p>
                Your saved papers and search history, managed by your
                ORBIT backend.
              </p>
            </div>

            <div className="data-panel">
              <div className="data-panel-head">
                <Bookmark />
                <strong>Saved research</strong>

                <button
                  className="quiet-button"
                  onClick={() => void loadMemory()}
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>

              {(memory?.saved_papers ?? []).map((paper, index) => {
                const id = String(paper.paper_id ?? paper.id ?? "");

                return (
                  <div className="memory-row" key={id || index}>
                    <div>
                      <strong>
                        {String(paper.title ?? id ?? "Saved paper")}
                      </strong>

                      <p>
                        {displayCategories(paper.categories).join(" · ")}
                      </p>

                      <small>{String(paper.saved_at ?? "")}</small>
                    </div>

                    <div className="memory-actions">
                      {Boolean(paper.url) && (
                        <a
                          href={String(paper.url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open paper
                        </a>
                      )}

                      <button
                        className="icon-button"
                        onClick={() => void deleteSavedPaper(id)}
                        aria-label="Remove saved paper"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {!memory?.saved_papers?.length && (
                <p className="panel-description">
                  No saved papers yet. Use the Save button on a research
                  paper to add it here.
                </p>
              )}
            </div>

            <div className="data-panel">
              <div className="data-panel-head">
                <History />
                <strong>Search history</strong>
              </div>

              {(memory?.history ?? []).map((item, index) => (
                <button
                  className="history-row"
                  key={index}
                  onClick={() => {
                    const previousQuery = String(item.query ?? "");
                    setQuery(previousQuery);
                    void runSearch(previousQuery);
                  }}
                >
                  <span>
                    <Search size={14} />
                    {String(item.query ?? "Research search")}
                  </span>

                  <small>{String(item.mode ?? "semantic")}</small>
                  <small>{String(item.searched_at ?? "")}</small>
                </button>
              ))}

              {!memory?.history?.length && (
                <p className="panel-description">
                  Your research searches will appear here.
                </p>
              )}
            </div>
          </section>
        )}

        {/* PREFERENCE DNA */}

        {tab === "preferences" && (
          <section className="workspace-page">
            <div className="page-heading">
              <span className="eyebrow">YOUR DISCOVERY PROFILE</span>

              <h1>
                Preference<span>DNA</span>
              </h1>

              <p>
                Your research interests are shaped by the feedback you
                give ORBIT.
              </p>
            </div>

            <div className="data-panel">
              <div className="data-panel-head">
                <Sparkles />
                <strong>Your preference profile</strong>

                <button
                  className="quiet-button"
                  onClick={() => void loadPreferences()}
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>

              <p className="panel-description">
                Preferred research categories learned from your likes
                and dislikes.
              </p>

              {Array.isArray(preferences?.preferred_categories) &&
              preferences.preferred_categories.length > 0 ? (
                <div className="preference-list">
                  {preferences.preferred_categories.map((item, index) => {
                    const entry = Array.isArray(item) ? item : [item, 0];
                    const label = String(entry[0] ?? "Unknown");
                    const score = Number(entry[1] ?? 0);

                    return (
                      <div
                        className="preference-row"
                        key={`${label}-${index}`}
                      >
                        <span>{label}</span>

                        <div className="similarity-track">
                          <i
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, score * 100)
                              )}%`
                            }}
                          />
                        </div>

                        <strong>{score.toFixed(2)}</strong>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <Sparkles size={28} />
                  <h3>Your Preference DNA is waiting</h3>

                  <p>
                    Like or dislike papers in Discover to help ORBIT learn
                    your research interests.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() => void openTab("discover")}
                  >
                    Explore papers <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="data-panel">
              <div className="data-panel-head">
                <ThumbsUp />
                <strong>How Preference DNA learns</strong>
              </div>

              <div className="feature-preview-grid">
                <div>
                  <ThumbsUp />
                  <h3>Helpful</h3>
                  <p>Like papers that match your interests.</p>
                </div>

                <div>
                  <ThumbsDown />
                  <h3>Less relevant</h3>
                  <p>Dislike papers that do not fit your interests.</p>
                </div>

                <div>
                  <Bookmark />
                  <h3>Save research</h3>
                  <p>Keep useful papers in your Research Memory.</p>
                </div>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* FOOTER */}

      <footer className="footer">
        <a
          className="brand footer-brand"
          href="#"
          onClick={e => {
            e.preventDefault();
            void openTab("discover");
          }}
        >
          <span className="brand-mark">
            <Orbit size={18} />
          </span>

          <span>
            ORBIT<span className="brand-ai"> AI</span>
            <small>BEYOND KEYWORDS</small>
          </span>
        </a>

        <span>Research discovery, guided by meaning.</span>
        <span>MiniLM · Semantic Search</span>
      </footer>

      <DetailPanel
        paper={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
