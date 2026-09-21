export interface IntentSuggestion {
  label: string;
  query: string;
  targetSlug: string;
  type: 'tool' | 'category' | 'starter-kit';
  targetUrl: string;
  description: string;
}

export const defaultIntentChips = [
  { label: 'Replace Google Photos', query: 'google photos alternative', targetUrl: '/tools/immich' },
  { label: 'Self-host Passwords', query: 'password vault', targetUrl: '/tools/vaultwarden' },
  { label: 'Team Wiki in an Afternoon', query: 'team documentation', targetUrl: '/tools/bookstack' },
  { label: 'Network Ad Blocker', query: 'ad blocker dns', targetUrl: '/tools/pi-hole' },
  { label: 'Cookie-Free Analytics', query: 'google analytics alternative', targetUrl: '/tools/umami' },
  { label: 'Run AI Locally', query: 'local llm model', targetUrl: '/tools/coder' }
];

export const allIntents: IntentSuggestion[] = [
  {
    label: 'Google Photos Alternative',
    query: 'google photos alternative',
    targetSlug: 'immich',
    type: 'tool',
    targetUrl: '/tools/immich',
    description: 'Self-hosted backup, facial recognition & mobile sync with zero tracking.'
  },
  {
    label: 'Free Office Suite & Cloud',
    query: 'office suite free',
    targetSlug: 'nextcloud',
    type: 'tool',
    targetUrl: '/tools/nextcloud',
    description: 'Document editing, calendar, contacts, and encrypted file cloud.'
  },
  {
    label: 'Run AI & Development Workspaces Locally',
    query: 'run ai locally',
    targetSlug: 'coder',
    type: 'tool',
    targetUrl: '/tools/coder',
    description: 'Reproducible developer workspaces and isolated compute environments.'
  },
  {
    label: 'Team Wiki & Engineering Docs',
    query: 'team wiki',
    targetSlug: 'bookstack',
    type: 'tool',
    targetUrl: '/tools/bookstack',
    description: 'Organized hierarchy by Books, Chapters & Pages with markdown & WYSIWYG.'
  },
  {
    label: 'Private Google Drive Replacement',
    query: 'self-host email cloud storage',
    targetSlug: 'nextcloud',
    type: 'tool',
    targetUrl: '/tools/nextcloud',
    description: 'Private files, Delta-syncing and multi-device sharing.'
  },
  {
    label: 'Network-Wide Ad Blocker',
    query: 'network ad blocker dns sinkhole',
    targetSlug: 'pi-hole',
    type: 'tool',
    targetUrl: '/tools/pi-hole',
    description: 'Blocks tracking and malware telemetry at the DNS level for all home devices.'
  },
  {
    label: 'Private Bitwarden Vault',
    query: 'password manager self host',
    targetSlug: 'vaultwarden',
    type: 'tool',
    targetUrl: '/tools/vaultwarden',
    description: 'Rust-native Bitwarden-compatible vault with zero-knowledge encryption.'
  },
  {
    label: 'Netflix / Plex Alternative',
    query: 'media server video streaming',
    targetSlug: 'jellyfin',
    type: 'tool',
    targetUrl: '/tools/jellyfin',
    description: 'Decentralized cinema, live TV, and audio streaming with hardware transcoding.'
  },
  {
    label: 'Zero-Tracking Web Analytics',
    query: 'google analytics alternative',
    targetSlug: 'umami',
    type: 'tool',
    targetUrl: '/tools/umami',
    description: 'Compliant, cookie-free web metrics engine with sub-2KB tracking snippet.'
  },
  {
    label: 'Personal Finance & Budgeting',
    query: 'ynab alternative budget ledger',
    targetSlug: 'actual-budget',
    type: 'tool',
    targetUrl: '/tools/actual-budget',
    description: 'Zero-based budgeting with local-first client-side encryption.'
  }
];

