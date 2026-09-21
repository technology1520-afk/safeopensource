import type { StarterKit } from '../types/tool';

export const starterKits: StarterKit[] = [
  {
    slug: 'first-home-server',
    title: 'First Home Server',
    tagline: 'The essential starter pack for your first mini PC or Raspberry Pi.',
    description: 'Transform an idle PC or Raspberry Pi into a reliable 24/7 home command center. This curated stack blocks network-wide advertisements, secures your family passwords, automates household devices, and pings your vital services.',
    difficulty: 'Beginner',
    estimated_time: '45 mins',
    tools: ['pi-hole', 'vaultwarden', 'home-assistant', 'uptime-kuma']
  },
  {
    slug: 'private-google-photos',
    title: 'Private Cloud & Photos',
    tagline: 'Regain digital sovereignty over your personal camera roll and documents.',
    description: 'A completely uncompromised replacement for Google Photos and Google Drive. Automatically backs up smartphone camera rolls with facial recognition and machine learning classification, while Nextcloud handles document collaboration.',
    difficulty: 'Intermediate',
    estimated_time: '1 hour',
    tools: ['immich', 'nextcloud', 'headscale']
  },
  {
    slug: 'team-wiki-in-an-afternoon',
    title: 'Team Wiki & Engineering Portal',
    tagline: 'Lightweight documentation, version control, and single sign-on for small teams.',
    description: 'Deploy an end-to-end technical organization platform in an afternoon without per-seat SaaS costs. Combines hierarchical documentation, git collaboration, and centralized OAuth2/SAML authentication.',
    difficulty: 'Intermediate',
    estimated_time: '90 mins',
    tools: ['bookstack', 'gitea', 'authentik']
  },
  {
    slug: 'privacy-first-web-stack',
    title: 'Privacy-First Web Suite',
    tagline: 'Compliant analytics, instant search, and synthetic uptime tracking.',
    description: 'Supercharge your public websites and applications with high-speed search, cookie-free compliance analytics, and public incident response status pages.',
    difficulty: 'Beginner',
    estimated_time: '30 mins',
    tools: ['plausible', 'meilisearch', 'uptime-kuma']
  },
  {
    slug: 'financial-sovereignty',
    title: 'Personal Finance Citadel',
    tagline: 'Zero-based budgeting and private financial archives behind zero-trust networking.',
    description: 'Take full control of your household budget and sensitive financial statements with zero-knowledge encryption and seamless cross-device synchronization.',
    difficulty: 'Beginner',
    estimated_time: '40 mins',
    tools: ['actual-budget', 'vaultwarden', 'headscale']
  }
];

export function getStarterKitBySlug(slug: string): StarterKit | undefined {
  return starterKits.find((k) => k.slug === slug);
}

