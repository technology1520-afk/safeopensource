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

export interface ToolRequirements {
  ram: string;
  disk: string;
  cpu: string;
  runtime: string[];
  difficulty: "Beginner-friendly" | "Intermediate" | "Needs a sysadmin";
}

export interface HowToUseStep {
  level: "Beginner" | "Comfortable" | "Developer";
  title: string;
  description: string;
  command?: string;
  url: string;
  estimatedTime: string;
}

export interface ToolAudience {
  perfectFor: string[];
  skipIf: string[];
}

export interface ToolMomentum {
  scoreDelta: number;
  deltaReason?: string;
  starGrowth?: number;
  sparkline: number[]; // 7-point scan history
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
  // Expanded What/How/Who & Momentum stack
  use_cases?: string[];
  how_to_use?: HowToUseStep[];
  requirements?: ToolRequirements;
  audience?: ToolAudience;
  momentum?: ToolMomentum;
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
  combined_verdict?: string;
  total_cost?: string;
  setup_time?: string;
  target_audience?: string;
  total_ram?: string;
  goal_tag?: string;
}

