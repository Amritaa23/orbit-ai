
import "./ResearchUniverse.css";

const categories = [
  {
    code: "cs.LG",
    title: "Machine Learning",
    description:
      "Research on algorithms that learn patterns and make predictions from data.",
    topics: "Supervised Learning · Classification · Regression",
    color: "violet",
  },
  {
    code: "cs.NE",
    title: "Neural & Evolutionary Computing",
    description:
      "Research involving neural networks, evolutionary methods and computational intelligence.",
    topics: "Neural Networks · Evolutionary Algorithms",
    color: "cyan",
  },
  {
    code: "cs.RO",
    title: "Robotics",
    description:
      "Research focused on intelligent robots, automation, motion and navigation.",
    topics: "Robot Navigation · Motion Planning · Control",
    color: "blue",
  },
];

const researchTopics = [
  "Artificial Intelligence",
  "Machine Learning",
  "Deep Learning",
  "Neural Networks",
  "Computer Vision",
  "Natural Language Processing",
  "Robotics",
  "Reinforcement Learning",
  "Algorithms & Optimization",
  "Data Science",
];

export default function ResearchUniverse() {
  return (
    <section className="research-universe">
      <div className="universe-heading">
        <span className="universe-eyebrow">
          THE KNOWLEDGE BEHIND ORBIT AI
        </span>

        <h2>
          Explore the <span>Research Universe.</span>
        </h2>

        <p>
          5,000 research papers. Multiple fields of discovery.
          One intelligent platform to explore ideas beyond keywords.
        </p>
      </div>

      <div className="universe-stats">
        <div className="universe-stat">
          <strong>5,000+</strong>
          <span>Research Papers</span>
        </div>

        <div className="universe-stat">
          <strong>384D</strong>
          <span>Semantic Embeddings</span>
        </div>

        <div className="universe-stat">
          <strong>MiniLM</strong>
          <span>Language Model</span>
        </div>

        <div className="universe-stat">
          <strong>arXiv</strong>
          <span>Research Source</span>
        </div>
      </div>

      <div className="universe-section-title">
        <span>01 / CLASSIFICATION</span>
        <h3>Understanding Research Categories</h3>
        <p>
          Our dataset uses arXiv subject classification codes
          to organize research papers.
        </p>
      </div>

      <div className="category-grid">
        {categories.map((category) => (
          <article
            className={`category-card ${category.color}`}
            key={category.code}
          >
            <span className="category-code">{category.code}</span>
            <h3>{category.title}</h3>
            <p>{category.description}</p>
            <div className="category-topics">{category.topics}</div>
          </article>
        ))}
      </div>

      <div className="universe-note">
        <strong>What does cs mean?</strong>
        <p>
          "cs" stands for Computer Science. The letters after
          the dot identify a specific research subject.
          For example, cs.LG represents Machine Learning.
        </p>
      </div>

      <div className="universe-section-title topics-heading">
        <span>02 / RESEARCH LANDSCAPE</span>
        <h3>What Can You Discover?</h3>
        <p>
          Explore a variety of research themes represented
          across the dataset.
        </p>
      </div>

      <div className="research-topic-grid">
        {researchTopics.map((topic, index) => (
          <div className="research-topic" key={topic}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{topic}</strong>
            <span className="topic-arrow">↗</span>
          </div>
        ))}
      </div>

      <div className="dataset-explanation">
        <div>
          <span className="universe-eyebrow">03 / WHY THIS DATASET?</span>
          <h3>Built on Real Research. Designed for Discovery.</h3>
        </div>

        <div className="dataset-points">
          <p>
            <strong>Research-backed:</strong> Uses actual research
            papers sourced from arXiv.
          </p>
          <p>
            <strong>Rich information:</strong> Titles, abstracts,
            authors, categories and publication details.
          </p>
          <p>
            <strong>Semantic understanding:</strong> MiniLM converts
            research text into 384-dimensional vectors.
          </p>
          <p>
            <strong>Meaning-based discovery:</strong> Cosine similarity
            helps identify papers with related meanings.
          </p>
        </div>
      </div>

      <p className="universe-disclaimer">
        Research themes are illustrative. Individual papers may have
        multiple arXiv categories, and dataset coverage varies.
      </p>
    </section>
  );
}
