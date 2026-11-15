export type Paper = {
  id: string;
  title: string;
  abstract?: string;
  authors?: string[] | string;
  categories?: string[] | string;
  published?: string;
  source?: string;
  url?: string;
  similarity?: number;
  score?: number;
  excerpt?: string;
};

export type SearchResponse = {
  results?: Paper[];
  papers?: Paper[];
  total?: number;
  query?: string;
  [key: string]: unknown;
};

export type FeatureTab = "discover" | "orbitmap" | "evidence" | "serendipity" | "memory" | "preferences";