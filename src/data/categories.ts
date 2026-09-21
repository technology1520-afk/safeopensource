import type { CategoryData } from '../types/tool';

export const categories: CategoryData[] = [
  {
    slug: 'monitoring-status',
    name: 'Monitoring & Status',
    tagline: 'Uptime trackers, system telemetry, and public incident status pages.',
    icon: 'Activity',
    intro: 'Continuous infrastructure observability requires tooling that reliably detects outages before end users report them. Self-hosted monitoring solutions keep internal health metrics private while eliminating recurring SaaS expenses for synthetic uptime pings. When evaluating monitoring utilities, prioritize active commit cadence and minimal attack surfaces since these services frequently interface directly with external web endpoints.'
  },
  {
    slug: 'password-auth',
    name: 'Passwords & Authentication',
    tagline: 'Cryptographic credential vaults, multi-factor tokens, and SSO identity brokers.',
    icon: 'Shield',
    intro: 'Credential stores represent the most critical single point of failure across personal and organizational threat models. Opting for open-source identity providers enables independent cryptographic auditability without trusting closed cloud vendors with master vaults. Ensure any credential manager you deploy features strict vulnerability disclosure policies, audited dependencies, and verified multi-factor support.'
  },
  {
    slug: 'media-streaming',
    name: 'Media & Streaming',
    tagline: 'Self-hosted video libraries, personal music streaming, and audiobook servers.',
    icon: 'PlayCircle',
    intro: 'Consolidating personal media collections into decentralized servers restores ownership over acquired cinema, lossless audio, and literature. Modern media engines deliver seamless hardware-accelerated transcoding while keeping consumption telemetry away from algorithmic ad brokers. Look for active container maintenance and rapid release cycles to ensure ongoing format compatibility and codec safety.'
  },
  {
    slug: 'cloud-storage',
    name: 'Cloud Storage & Sync',
    tagline: 'Encrypted file synchronizers, document workspaces, and backup nodes.',
    icon: 'Cloud',
    intro: 'Self-hosted file cloud platforms provide cross-device synchronization without handing sensitive documents over to proprietary hyperscalers. Reliable platforms combine robust desktop sync clients, delta-file chunking, and end-to-end encryption layers for remote shares. When choosing file storage systems, scrutinize database migration stability and verify that storage engines undergo regular security penetration reviews.'
  },
  {
    slug: 'notes-wiki',
    name: 'Notes & Documentation',
    tagline: 'Collaborative knowledge bases, technical wikis, and local-first notebooks.',
    icon: 'FileText',
    intro: 'Building a durable second brain necessitates open document formats that survive proprietary software deprecation cycles. Self-hosted documentation platforms offer team-wide permission management alongside revision tracking and markdown-native editing flows. Verify that candidate platforms support standardized export protocols and have low maintenance complexity so your knowledge base never becomes unrecoverable.'
  },
  {
    slug: 'home-automation',
    name: 'Home Automation & IoT',
    tagline: 'Local-first smart home hubs, protocol bridges, and micro-controller automation.',
    icon: 'Home',
    intro: 'Smart home hardware shouldn\'t compromise residential privacy or stop functioning when upstream cloud servers experience outages. Local-first automation hubs communicate directly with Zigbee, Z-Wave, and Matter devices over local networks without sending telemetry outside your perimeter. Because IoT gateways interface with physical domestic controls, prioritize software backed by disciplined vulnerability triage and transparent sandboxing.'
  },
  {
    slug: 'analytics-metrics',
    name: 'Analytics & Privacy',
    tagline: 'Cookieless web analytics, product traffic telemetry, and compliance dashboards.',
    icon: 'BarChart2',
    intro: 'Modern digital analytics should surface user journeys and conversion insights without harvesting personal identifiable information. Lightweight, cookie-free telemetry engines maintain GDPR, CCPA, and PECR compliance automatically while preventing massive script bloat on customer devices. Check that your analytics service features strict database query sanitization and minimal external tracking dependencies.'
  },
  {
    slug: 'developer-tools',
    name: 'Developer Tools',
    tagline: 'Self-hosted git repositories, API clients, and remote development workspaces.',
    icon: 'Code2',
    intro: 'Developer productivity accelerates when code repositories, testing environments, and API tooling run within controlled boundaries. Self-hosting developer suites protects intellectual property and enables custom enterprise CI/CD integration free from external rate limits. Prioritize tools that publish verifiable supply-chain attestations and demonstrate consistent OpenSSF scorecard ratings.'
  },
  {
    slug: 'databases-search',
    name: 'Databases & Search',
    tagline: 'Instant full-text typo-tolerant search engines and embedded document stores.',
    icon: 'Database',
    intro: 'High-speed search engines and embeddable key-value stores power instantaneous query experiences across web and mobile applications. Open-source search technologies give development teams total control over index schemas, memory footprints, and typo-tolerant ranking heuristics. Look for engines with deterministic memory management, rigorous regression test suites, and transparent release changelogs.'
  },
  {
    slug: 'network-vpn',
    name: 'Networking & VPN',
    tagline: 'Zero-trust mesh networks, private DNS ad-blockers, and WireGuard tunnels.',
    icon: 'Network',
    intro: 'Controlling your network egress and ingress is foundational to preventing surveillance, tracking, and lateral intruder movement. Software-defined overlay networks and local DNS sinkholes allow secure interconnectivity between remote nodes without exposing management ports to the public internet. Ensure your networking primitives rely on proven cryptographic kernels like WireGuard and maintain tight release cadences.'
  },
  {
    slug: 'automation-workflow',
    name: 'Workflow Automation',
    tagline: 'Visual event flow builders, webhook routers, and asynchronous task runners.',
    icon: 'Cpu',
    intro: 'Automating business logic and data plumbing across disparate APIs saves countless hours of manual overhead. Self-hosted workflow orchestrators keep API keys and internal business payloads within your private infrastructure rather than third-party iPaaS servers. Because these platforms execute arbitrary code connectors, carefully review sandbox isolation mechanisms and credential storage hygiene.'
  },
  {
    slug: 'photo-management',
    name: 'Photo Management',
    tagline: 'Facial recognition galleries, mobile backup daemons, and EXIF metadata viewers.',
    icon: 'Image',
    intro: 'Family photo libraries capture our most intimate memories and should never be used to train proprietary behavioral profiling models. Modern open-source photo managers offer instantaneous mobile camera roll backups, machine-learning-based object tagging, and map visualizations. Ensure any candidate gallery platform provides reliable database integrity safeguards and active bug triage for thumbnail generation routines.'
  },
  {
    slug: 'finance-budgeting',
    name: 'Finance & Budgeting',
    tagline: 'Zero-based envelope budgeting, double-entry ledgers, and transaction synchronizers.',
    icon: 'DollarSign',
    intro: 'Financial sovereignty begins with knowing your net worth without transmitting bank credentials to aggressive commercial aggregators. Self-hosted personal finance systems utilize local encryption keys and zero-based budgeting principles to help households take control of capital allocation. Always verify that personal finance software has end-to-end encrypted synchronization and a stable data persistence model.'
  },
  {
    slug: 'ai-agents',
    name: 'AI Agents & Autonomous Systems',
    tagline: 'Autonomous terminal, coding, and workflow agents with credential and shell access.',
    icon: 'Bot',
    intro: 'Autonomous AI agents execute shell commands, manage local filesystems, and interact with web applications using operator credentials by design. Because a compromised agent or prompt injection represents an immediate threat to the entire host system, SafeOpenSource bumps the Security Health weight from the standard 0.40 to 0.55 for this category. Prioritize agents featuring isolated Docker sandboxes, strict human-in-the-loop confirmation gates, and verified vulnerability disclosure policies.'
  }
];

export function getCategoryBySlug(slug: string): CategoryData | undefined {
  return categories.find((c) => c.slug === slug);
}

