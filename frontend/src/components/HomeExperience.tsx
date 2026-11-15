import { useState } from "react";
import {
  Search, Sparkles, Network, BrainCircuit, Compass,
  FlaskConical, Bookmark, ArrowRight, Atom, Zap, Orbit
} from "lucide-react";

const features = [
  {
    icon: Search,
    number: "01",
    title: "IntentLens",
    subtitle: "Search by meaning",
    description: "Understand the intent behind a research question instead of relying only on matching keywords."
  },
  {
    icon: BrainCircuit,
    number: "02",
    title: "Preference DNA",
    subtitle: "Learns what matters",
    description: "Feedback helps ORBIT adapt discovery results to your research interests."
  },
  {
    icon: Network,
    number: "03",
    title: "OrbitMap",
    subtitle: "Connect the dots",
    description: "Explore relationships between papers, research categories and concepts."
  },
  {
    icon: FlaskConical,
    number: "04",
    title: "EvidenceLab",
    subtitle: "Compare ideas",
    description: "Compare multiple papers, inspect semantic similarity and discover shared concepts."
  },
  {
    icon: Compass,
    number: "05",
    title: "Serendipity",
    subtitle: "Find the unexpected",
    description: "Explore beyond the closest matches and uncover diverse research directions."
  },
  {
    icon: Bookmark,
    number: "06",
    title: "Research Memory",
    subtitle: "Keep your discoveries",
    description: "Save useful papers and revisit your previous research searches."
  }
];

export default function HomeExperience() {
  const [view, setView] = useState<"traditional" | "orbit">("orbit");

  return (
    <section className="home-experience">
      <div className="experience-intro">
        <span className="eyebrow"><Sparkles size={13}/> THE ORBIT DIFFERENCE</span>
        <h2>Search is easy.<br/><em>Discovery is different.</em></h2>
        <p>
          A search engine should do more than find words.
          It should help you understand ideas, connect research
          and discover what you didn't know to look for.
        </p>
      </div>

      <div className="discovery-demo">
        <div className="demo-heading">
          <div>
            <span className="eyebrow">ONE QUESTION. TWO APPROACHES.</span>
            <h3>What happens when you search?</h3>
          </div>
          <span className="demo-live"><i/> LIVE CONCEPT DEMO</span>
        </div>

        <div className="demo-query">
          <Search size={17}/>
          <span>How can AI help doctors detect diseases earlier?</span>
          <Sparkles size={16}/>
        </div>

        <div className="demo-switch">
          <button className={view === "traditional" ? "active" : ""} onClick={() => setView("traditional")}>
            Traditional search
          </button>
          <button className={view === "orbit" ? "active" : ""} onClick={() => setView("orbit")}>
            <Orbit size={14}/> ORBIT AI
          </button>
        </div>

        <div className={`demo-result-area ${view === "orbit" ? "orbit-view" : "traditional-view"}`} key={view}>
          {view === "traditional" ? (
            <div className="traditional-demo">
              <div className="demo-result-label"><Search size={14}/> KEYWORD MATCHING</div>
              <div className="keyword-cloud">
                {["AI", "doctors", "detect", "diseases", "earlier"].map((word, i) => (
                  <span className="keyword-chip" style={{ animationDelay: `${i * 100}ms` }} key={word}>{word}</span>
                ))}
              </div>
              <div className="demo-paper-list">
                <div><span>01</span><strong>AI methods for disease detection</strong><small>Matched terms: AI · disease · detection</small></div>
                <div><span>02</span><strong>Early disease diagnosis using machine learning</strong><small>Matched terms: disease · early · learning</small></div>
                <div><span>03</span><strong>Artificial intelligence in healthcare</strong><small>Matched terms: artificial intelligence · healthcare</small></div>
              </div>
              <p className="demo-caption">Useful results based on matching words. Related ideas may remain undiscovered.</p>
            </div>
          ) : (
            <div className="orbit-demo">
              <div className="demo-result-label"><Atom size={15}/> MEANING-BASED DISCOVERY</div>
              <div className="orbit-flow">
                <div className="orbit-query-node">
                  <Search size={18}/>
                  <strong>Your question</strong>
                  <small>Research intent</small>
                </div>
                <div className="flow-particles"><i/><i/><i/></div>
                <div className="orbit-concept-nodes">
                  <div className="concept-node concept-one"><BrainCircuit/><span>Medical AI</span></div>
                  <div className="concept-node concept-two"><Zap/><span>Early diagnosis</span></div>
                  <div className="concept-node concept-three"><Network/><span>Pattern recognition</span></div>
                  <div className="concept-node concept-four"><Sparkles/><span>Predictive models</span></div>
                </div>
                <div className="flow-particles reverse"><i/><i/><i/></div>
                <div className="orbit-discovery-node">
                  <Orbit size={21}/>
                  <strong>Research discoveries</strong>
                  <small>Related papers and ideas</small>
                </div>
              </div>
              <div className="demo-insight">
                <Sparkles size={16}/>
                <p><strong>Beyond the exact words.</strong> ORBIT can surface papers about predictive modelling, medical imaging and clinical decision support because they relate to the meaning of your question.</p>
              </div>
              <p className="demo-caption">Illustrative concept demo. Actual results come from ORBIT's MiniLM semantic search engine.</p>
            </div>
          )}
        </div>
      </div>

      <div className="experience-divider">
        <span/>
        <span>ONE ENGINE · SIX WAYS TO DISCOVER</span>
        <span/>
      </div>

      <div className="feature-intro">
        <span className="eyebrow">EXPLORE THE ORBIT UNIVERSE</span>
        <h2>Not just search.<br/><em>A complete research journey.</em></h2>
        <p>From your first question to your next big idea, every feature has a purpose.</p>
      </div>

      <div className="home-feature-grid">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <article className="home-feature-card" key={feature.number} style={{ animationDelay: `${index * 90}ms` }}>
              <div className="feature-card-top">
                <span>{feature.number} / 06</span>
                <Icon size={21}/>
              </div>
              <h3>{feature.title}</h3>
              <span className="feature-subtitle">{feature.subtitle}</span>
              <p>{feature.description}</p>
              <div className="feature-card-line"/>
            </article>
          );
        })}
      </div>

      <div className="experience-cta">
        <div className="cta-orbit"><Orbit size={30}/></div>
        <div>
          <span className="eyebrow">YOUR NEXT DISCOVERY STARTS HERE</span>
          <h3>Follow a question.<br/><em>Find a universe.</em></h3>
        </div>
        <button onClick={() => document.querySelector<HTMLInputElement>(".search-box input")?.focus()}>
          Start exploring <ArrowRight size={17}/>
        </button>
      </div>
    </section>
  );
}

