import type { StarterKit } from '../types/tool';

export const starterKits: StarterKit[] = [
  {
    slug: 'private-google-stack',
    title: 'Private Google Stack',
    tagline: 'Replace Google Photos, Drive, and Chrome sync with uncompromised sovereignty.',
    description: 'A sovereign digital headquarters that frees your household from Google Workspace, Google Photos, and commercial cloud subscriptions. Immich provides seamless mobile camera roll backups with on-device facial recognition, Nextcloud manages files and calendar sync, and Vaultwarden safeguards passwords.',
    difficulty: 'Intermediate',
    estimated_time: '60 mins',
    setup_time: '60 mins',
    total_ram: '4–6 GB RAM',
    goal_tag: 'google-replacement',
    target_audience: 'Homelabbers wanting total cloud independence for mobile & desktop',
    tools: ['immich', 'nextcloud', 'vaultwarden']
  },
  {
    slug: 'run-ai-at-home',
    title: 'Run AI & Automation at Home',
    tagline: 'Local machine learning, vector search, and autonomous workflow engines.',
    description: 'Build a private AI workstation without cloud API fees or data leakage. Combines Immich’s local neural vision recognition, n8n’s multi-agent workflow automation, and Meilisearch’s sub-50ms instant semantic retrieval engine.',
    difficulty: 'Advanced',
    estimated_time: '45 mins',
    setup_time: '45 mins',
    total_ram: '8 GB RAM',
    goal_tag: 'ai-automation',
    target_audience: 'Developers building private AI pipelines and home automation bots',
    tools: ['immich', 'n8n', 'meilisearch']
  },
  {
    slug: 'team-wiki-in-an-afternoon',
    title: 'Team Wiki in an Afternoon',
    tagline: 'Lightweight documentation, version control, and single sign-on for small teams.',
    description: 'Deploy an end-to-end technical organization platform in an afternoon without per-seat SaaS costs. Combines hierarchical BookStack documentation, lightweight Gitea git repositories, and centralized Authentik OAuth2/SAML identity.',
    difficulty: 'Intermediate',
    estimated_time: '90 mins',
    setup_time: '90 mins',
    total_ram: '2–4 GB RAM',
    goal_tag: 'team-wiki',
    target_audience: 'Small engineering teams and startups escaping Notion and Jira pricing',
    tools: ['bookstack', 'gitea', 'authentik']
  },
  {
    slug: 'first-home-server',
    title: 'First Home Server',
    tagline: 'The essential starter pack for your first mini PC or Raspberry Pi.',
    description: 'Transform an idle PC or Raspberry Pi into a reliable 24/7 home command center. Blocks network-wide advertisements, secures your family passwords, automates household devices, and pings your vital services.',
    difficulty: 'Beginner',
    estimated_time: '45 mins',
    setup_time: '45 mins',
    total_ram: '1–2 GB RAM',
    goal_tag: 'home-server',
    target_audience: 'First-time self-hosters and mini PC enthusiasts',
    tools: ['pi-hole', 'vaultwarden', 'home-assistant', 'uptime-kuma']
  },
  {
    slug: 'privacy-first-web-stack',
    title: 'Privacy-First Web Stack',
    tagline: 'Compliant analytics, instant search, and synthetic uptime tracking.',
    description: 'Supercharge your public websites and applications with high-speed search, cookie-free compliance analytics, and public incident response status pages.',
    difficulty: 'Beginner',
    estimated_time: '30 mins',
    setup_time: '30 mins',
    total_ram: '1 GB RAM',
    goal_tag: 'web-infra',
    target_audience: 'Web developers needing GDPR-compliant telemetry without Google Analytics',
    tools: ['plausible', 'meilisearch', 'uptime-kuma']
  },
  {
    slug: 'financial-sovereignty',
    title: 'Personal Finance Citadel',
    tagline: 'Zero-based budgeting and private financial archives behind zero-trust networking.',
    description: 'Take full control of your household budget and sensitive financial statements with zero-knowledge encryption and seamless cross-device synchronization.',
    difficulty: 'Beginner',
    estimated_time: '40 mins',
    setup_time: '40 mins',
    total_ram: '1 GB RAM',
    goal_tag: 'finance',
    target_audience: 'Budgeters replacing YNAB and Mint with zero data monetization',
    tools: ['actual-budget', 'vaultwarden', 'headscale']
  }
];

export function getStarterKitBySlug(slug: string): StarterKit | undefined {
  return starterKits.find((k) => k.slug === slug);
}
