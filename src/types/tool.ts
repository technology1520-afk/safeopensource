export type Verdict = "healthy" | "caution" | "risky";

export interface ScoreComponents {
  security_health: number; // 0-100 (35% weight)
  maintenance: number;     // 0-100 (30% weight)
  community: number;       // 0-100 (20% weight)
  releases: number;        // 0-100 (15% weight)
}

export interface InstallCommands {
  docker?: string;
  npm?: string;
  pip?: string;
  cargo?: string;
  go?: string;
  brew?: string;
  curl?: string;
}

export interface ToolData {
  slug: string;
  repo: string;
  name: string;
  tagline: string;
  category: string;
  license_spdx: string;
  stars: number;
  contributors: number;
  last_push_days: number;
  latest_release: string;
  safety_score: number;
  verdict: Verdict;
  risk_reasons: string[];
  scorecard: number | null;
  components: ScoreComponents;
  ai_report: string;
  scanned_at: string;
  language: string;
  self_host_difficulty: "Easy" | "Medium" | "Advanced";
  install_commands: InstallCommands;
  website_url?: string;
}

export interface CategoryData {
  slug: string;
  name: string;
  tagline: string;
  icon: string;
  intro: string;
}

export interface StarterKit {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimated_time: string;
  tools: string[]; // slugs
}

