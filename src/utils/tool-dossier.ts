import type { ToolData, HowToUseStep, ToolRequirements, ToolAudience } from '../types/tool';

export interface ToolDossier {
  useCases: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  howToUse: HowToUseStep[];
  requirements: ToolRequirements;
  audience: ToolAudience;
}

// Dedicated profiles for major tools
const specificDossiers: Record<string, ToolDossier> = {
  immich: {
    useCases: [
      {
        title: 'Google Photos & iCloud Replacement',
        description: 'Auto-syncs full-resolution smartphone photos and RAW assets in background without cloud subscription limits.',
        icon: 'camera'
      },
      {
        title: 'On-Device Facial & Object Recognition',
        description: 'Runs local neural networks (CLIP & InsightFace) to identify family members and search by concepts like "sunset on beach".',
        icon: 'cpu'
      },
      {
        title: 'Partner Sharing & Family Libraries',
        description: 'Granular multi-user access with partner sharing, collaborative albums, and public share links protected by password or expiry.',
        icon: 'users'
      },
      {
        title: 'Geographic Interactive Heatmaps',
        description: 'Extracts EXIF GPS coordinates into an offline Leaflet map showing exactly where every trip was documented.',
        icon: 'map-pin'
      }
    ],
    howToUse: [
      {
        level: 'Beginner',
        title: 'Docker Compose One-Liner',
        description: 'Download the official compose template and start the container stack with default local volume mounts.',
        command: 'curl -fsSL https://raw.githubusercontent.com/immich-app/immich/main/docker/docker-compose.yml -o docker-compose.yml && docker compose up -d',
        url: 'https://immich.app/docs/install/docker-compose',
        estimatedTime: '10 minutes'
      },
      {
        level: 'Comfortable',
        title: 'Custom HW Acceleration & External Library',
        description: 'Configure Intel QuickSync / NVIDIA NVENC for hardware transcoding and point Immich to your existing NAS photo archive in read-only mode.',
        command: 'docker compose -f docker-compose.yml -f docker-compose.hwaccel.yml up -d',
        url: 'https://immich.app/docs/features/hardware-transcoding',
        estimatedTime: '25 minutes'
      },
      {
        level: 'Developer',
        title: 'Bare-Metal Microservices & CLI API Ingest',
        description: 'Deploy the Immich server, microservices, machine-learning server, and PostgreSQL pgvector separately, bulk-ingesting via CLI.',
        command: 'npm install -g @immich/cli && immich upload --key "$IMMICH_API_KEY" --server "https://photos.internal" /mnt/storage/raw-photos',
        url: 'https://immich.app/docs/developer-guide',
        estimatedTime: '45 minutes'
      }
    ],
    requirements: {
      ram: '4 GB minimum (8 GB recommended for ML facial recognition)',
      disk: '60 GB system + dedicated NVMe/HDD photo archive storage',
      cpu: 'x86_64 or ARM64 with AVX / NEON instructions (2+ cores)',
      runtime: ['Docker', 'Docker Compose', 'PostgreSQL 14+ (pgvector)', 'Redis'],
      difficulty: 'Intermediate'
    },
    audience: {
      perfectFor: [
        'Homelabbers with a mini PC (N100, Raspberry Pi 5 8GB, or Intel NUC) looking to leave Google Photos.',
        'Families needing private, uncompressed automatic camera roll backups across both iOS and Android.',
        'Photographers who demand non-destructive storage where original file hierarchies and RAW files remain intact.'
      ],
      skipIf: [
        'You have zero tolerance for reading breaking changelog notes during minor version upgrades.',
        'You are running on a 1 GB RAM low-end VPS without swap space.',
        'You require instant cloud-based web editing like Adobe Lightroom Web rather than raw digital asset management.'
      ]
    }
  },
  uptime_kuma: {
    useCases: [
      {
        title: 'Multi-Protocol Synthetic Monitoring',
        description: 'Pings HTTP(s), TCP ports, DNS records, Ping ICMP, Docker containers, Steam game servers, and TLS certificate expiries.',
        icon: 'activity'
      },
      {
        title: 'Instant Multi-Channel Alert Dispatch',
        description: 'Dispatches real-time down alerts via 90+ notification services including Discord, Telegram, Pushover, Slack, and webhooks.',
        icon: 'bell'
      },
      {
        title: 'Custom Branded Public Status Pages',
        description: 'Exposes beautiful incident history dashboards to your users with custom incident bulletins and subdomain mapping.',
        icon: 'layout'
      }
    ],
    howToUse: [
      {
        level: 'Beginner',
        title: 'Single Docker Container',
        description: 'Run Uptime Kuma in a self-contained container with a local persistent SQLite volume.',
        command: 'docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1',
        url: 'https://github.com/louislam/uptime-kuma/wiki',
        estimatedTime: '3 minutes'
      },
      {
        level: 'Comfortable',
        title: 'Docker Compose Behind Reverse Proxy',
        description: 'Deploy behind Traefik, Caddy, or Nginx Proxy Manager with automatic Let’s Encrypt TLS certificates and WebSocket headers.',
        command: 'docker compose -f docker-compose.yml up -d',
        url: 'https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy',
        estimatedTime: '15 minutes'
      },
      {
        level: 'Developer',
        title: 'Node.js Bare-Metal or Cluster Deployment',
        description: 'Clone the repository, compile TypeScript assets, and run via PM2 process manager or systemd service unit.',
        command: 'git clone https://github.com/louislam/uptime-kuma.git && cd uptime-kuma && npm run setup && pm2 start server/server.js --name uptime-kuma',
        url: 'https://github.com/louislam/uptime-kuma/blob/master/extra/uptime-kuma.service',
        estimatedTime: '20 minutes'
      }
    ],
    requirements: {
      ram: '512 MB minimum (1 GB recommended for >100 monitors)',
      disk: '10 GB storage for historical SQLite metrics retention',
      cpu: '1 vCPU (any x86_64, ARMv7, or ARM64 architecture)',
      runtime: ['Docker', 'Node.js 18+', 'SQLite 3'],
      difficulty: 'Beginner-friendly'
    },
    audience: {
      perfectFor: [
        'Anyone with a Raspberry Pi or low-cost \$4/mo VPS who wants to monitor homelab or client websites.',
        'Developers who want a free alternative to BetterUptime, Pingdom, or Statuspage with zero vendor lock-in.',
        'Teams needing clean incident status boards without monthly per-subscriber fees.'
      ],
      skipIf: [
        'You require enterprise distributed multi-region probe workers out-of-the-box (requires Kuma agent fork or Prometheus).',
        'You need APM-style distributed code-level tracing (use SigNoz or OpenTelemetry instead).'
      ]
    }
  },
  vaultwarden: {
    useCases: [
      {
        title: 'Full Bitwarden Client Ecosystem Compatibility',
        description: 'Works seamlessly with official Bitwarden extensions (Chrome, Firefox, Safari) and mobile apps (iOS, Android).',
        icon: 'key'
      },
      {
        title: 'Zero-Knowledge End-to-End Encryption',
        description: 'All vault data, passwords, and TOTP keys are encrypted with AES-256 client-side before touching the server.',
        icon: 'shield'
      },
      {
        title: 'Secure Organization & Family Password Sharing',
        description: 'Share banking credentials, Wi-Fi keys, and team API secrets with emergency access protocols and fine-grained collections.',
        icon: 'users'
      },
      {
        title: 'Integrated Two-Factor Authenticator (TOTP)',
        description: 'Generate 6-digit rolling authenticator codes directly within vault items, replacing external auth apps.',
        icon: 'lock'
      }
    ],
    howToUse: [
      {
        level: 'Beginner',
        title: 'Single-Container Launch with Persistent Volume',
        description: 'Spin up the lightweight Rust binary with persistent SQLite storage behind an SSL reverse proxy.',
        command: 'docker run -d --name vaultwarden -v /vw-data/:/data/ --restart unless-stopped -p 8080:80 vaultwarden/server:latest',
        url: 'https://github.com/dani-garcia/vaultwarden/wiki',
        estimatedTime: '5 minutes'
      },
      {
        level: 'Comfortable',
        title: 'Compose with Automated Encrypted Backups',
        description: 'Run Vaultwarden alongside a cron backup container that streams encrypted SQLite snapshots to S3 or local NAS.',
        command: 'docker compose -f docker-compose.vaultwarden.yml up -d',
        url: 'https://github.com/dani-garcia/vaultwarden/wiki/Backing-up-your-vault',
        estimatedTime: '20 minutes'
      },
      {
        level: 'Developer',
        title: 'Hardened PostgreSQL Backend & Argon2id Tuning',
        description: 'Connect Vaultwarden to external PostgreSQL with custom Argon2id memory and parallelism iteration parameters.',
        command: 'DATABASE_URL="postgresql://vw:secret@postgres:5432/vaultwarden" ARGON2_MEMORY=65536 docker compose up -d',
        url: 'https://github.com/dani-garcia/vaultwarden/wiki/Using-the-PostgreSQL-Backend',
        estimatedTime: '30 minutes'
      }
    ],
    requirements: {
      ram: '64 MB minimum (extremely low footprint written in Rust; 256 MB recommended)',
      disk: '2 GB SSD storage',
      cpu: '1 vCPU (operates smoothly even on a \$2/mo VPS or Raspberry Pi 2)',
      runtime: ['Docker', 'Reverse Proxy (HTTPS required for WebCrypto)', 'SQLite or PostgreSQL'],
      difficulty: 'Beginner-friendly'
    },
    audience: {
      perfectFor: [
        'Homelabbers and small families who want full Bitwarden Premium features (TOTP, file attachments) for \$0.',
        'Privacy-conscious individuals demanding zero telemetry and full ownership of their master password vault.',
        'Users running low-power servers or constrained VPS instances where official Bitwarden (MSSQL) is too heavy.'
      ],
      skipIf: [
        'You cannot set up HTTPS (modern browsers refuse to load WebCrypto API over unencrypted HTTP).',
        'You need corporate enterprise directory sync with active SCIM provisioning without running an external sync bridge.'
      ]
    }
  },
  pi_hole: {
    useCases: [
      {
        title: 'Network-Wide Ad & Telemetry Blocking',
        description: 'Intercepts DNS requests for ad trackers, telemetry beacons, and malware domains across every device on your home LAN.',
        icon: 'shield'
      },
      {
        title: 'Smart TV & IoT Device Taming',
        description: 'Blocks smart TVs and connected appliances from phoning home or injecting intrusive video sidebar ads.',
        icon: 'tv'
      },
      {
        title: 'Local DNS Records & Reverse Resolution',
        description: 'Maps homelab local hostnames (e.g. `nas.home`, `router.home`) to internal LAN IPs without public DNS records.',
        icon: 'globe'
      }
    ],
    howToUse: [
      {
        level: 'Beginner',
        title: 'Docker Quickstart with Host Ports',
        description: 'Bind port 53 UDP/TCP and port 80 to start filtering DNS immediately on your local machine or server.',
        command: 'docker run -d --name pihole -p 53:53/tcp -p 53:53/udp -p 80:80 -v pihole_etc:/etc/pihole -v pihole_dnsmasq:/etc/dnsmasq.d --restart=unless-stopped pihole/pihole:latest',
        url: 'https://docs.pi-hole.net/main/basic-install/',
        estimatedTime: '5 minutes'
      },
      {
        level: 'Comfortable',
        title: 'Macvlan Dedicated IP & DHCP Server',
        description: 'Assign Pi-hole its own dedicated LAN IP via Docker macvlan and take over DHCP leasing from your ISP router.',
        command: 'docker compose -f docker-compose.macvlan.yml up -d',
        url: 'https://docs.pi-hole.net/docker/DHCP/',
        estimatedTime: '25 minutes'
      },
      {
        level: 'Developer',
        title: 'Unbound Recursive DNS Resolver Integration',
        description: 'Pair Pi-hole with local recursive Unbound resolver on port 5335 to bypass upstream DNS servers entirely.',
        command: 'sudo apt update && sudo apt install unbound -y && curl -o /etc/unbound/unbound.conf.d/pi-hole.conf https://docs.pi-hole.net/guides/dns/unbound/pi-hole.conf',
        url: 'https://docs.pi-hole.net/guides/dns/unbound/',
        estimatedTime: '35 minutes'
      }
    ],
    requirements: {
      ram: '512 MB minimum (1 GB recommended)',
      disk: '4 GB storage',
      cpu: '1 vCPU (Runs on Raspberry Pi Zero or any x86 server)',
      runtime: ['Docker or Linux bare-metal (Debian/Ubuntu/Fedora)', 'DNS port 53'],
      difficulty: 'Beginner-friendly'
    },
    audience: {
      perfectFor: [
        'Anyone with a Raspberry Pi or home router who wants ads blocked on mobile phones, tablets, and smart TVs.',
        'Privacy enthusiasts looking to prevent ISP DNS logging and invasive tracking domains.',
        'Homelab managers needing predictable internal `.lan` domain routing.'
      ],
      skipIf: [
        'You have family members who frequently click sponsored Google Search result ad links and get confused by 0.0.0.0 resolution.',
        'Your ISP router forces DNS rebind protection or locks down DNS settings without DHCP override options.'
      ]
    }
  },
  nextcloud: {
    useCases: [
      {
        title: 'Enterprise-Grade Private Cloud Storage',
        description: 'Drop-in self-hosted replacement for Google Drive, Dropbox, and Box with automatic file sync clients.',
        icon: 'folder'
      },
      {
        title: 'Real-Time Document Collaboration',
        description: 'Co-edit spreadsheets, text documents, and presentations simultaneously using integrated Nextcloud Office (Collabora).',
        icon: 'edit'
      },
      {
        title: 'Integrated Calendar, Contacts & Webmail',
        description: 'Full CalDAV and CardDAV synchronization across iOS, Android, Thunderbird, and macOS devices.',
        icon: 'calendar'
      },
      {
        title: 'End-to-End Encrypted Group Folders',
        description: 'Protect confidential business files with client-side zero-knowledge encrypted vaults and fine permissions.',
        icon: 'lock'
      }
    ],
    howToUse: [
      {
        level: 'Beginner',
        title: 'Nextcloud AIO (All-in-One) Installer',
        description: 'Launch the official Nextcloud All-in-One container management engine with one command.',
        command: 'docker run -d --sig-proxy=false --name nextcloud-aio-mastercontainer --restart always -p 80:80 -p 8080:8080 -p 443:443 -v nextcloud_aio_mastercontainer:/mnt/docker-aio-config -v /var/run/docker.sock:/var/run/docker.sock:ro nextcloud/all-in-one:latest',
        url: 'https://github.com/nextcloud/all-in-one#how-to-use-this',
        estimatedTime: '15 minutes'
      },
      {
        level: 'Comfortable',
        title: 'Docker Compose with Redis & PostgreSQL',
        description: 'Deploy Nextcloud FPM with Caddy/Nginx, dedicated Redis memory cache, and optimized PostgreSQL database.',
        command: 'docker compose -f docker-compose.yml up -d',
        url: 'https://github.com/nextcloud/docker',
        estimatedTime: '30 minutes'
      },
      {
        level: 'Developer',
        title: 'Bare-Metal Apache/PHP 8.3 with Cron & OCC CLI',
        description: 'Install PHP 8.3 FPM extensions, tune OPcache memory parameters, and automate system tasks via Linux systemd cron.',
        command: 'sudo -u www-data php /var/www/nextcloud/occ maintenance:install --database "pgsql" --database-name "nextcloud" --database-user "nextcloud" --admin-user "admin"',
        url: 'https://docs.nextcloud.com/server/latest/admin_manual/installation/',
        estimatedTime: '60 minutes'
      }
    ],
    requirements: {
      ram: '2 GB minimum (4 GB+ recommended with Nextcloud Office / Talk)',
      disk: '100 GB+ storage for user files and database indices',
      cpu: '2+ vCPUs recommended for responsive indexing and thumbnail generation',
      runtime: ['Docker / PHP 8.2+', 'PostgreSQL or MariaDB', 'Redis', 'Web server (Apache/Nginx/Caddy)'],
      difficulty: 'Intermediate'
    },
    audience: {
      perfectFor: [
        'Small businesses and non-profits needing collaborative office tools without recurring Google Workspace or Office 365 licensing.',
        'Teams with privacy/regulatory compliance requirements (HIPAA, GDPR) requiring on-premise document storage.',
        'Homelab power users who want an all-in-one digital hub for files, notes, calendar, and task management.'
      ],
      skipIf: [
        'You only want a simple fast file sync server without heavy PHP apps (Seafile or Syncthing are much lighter).',
        'You have limited server resources (<1 GB RAM) or don’t want to manage regular database maintenance.'
      ]
    }
  }
};

// Fallback generator for tools not explicitly defined in specificDossiers
export function getToolDossier(tool: ToolData): ToolDossier {
  // Check specific overrides in tool.ts JSON if present
  const explicitKey = tool.slug.replace(/-/g, '_');
  if (specificDossiers[explicitKey]) {
    return specificDossiers[explicitKey];
  }
  if (specificDossiers[tool.slug]) {
    return specificDossiers[tool.slug];
  }

  // Dynamic fallback based on tool characteristics
  const defaultCommand = tool.install_commands.docker ||
    tool.install_commands.npm ||
    tool.install_commands.pip ||
    tool.install_commands.curl ||
    `docker run -d --name ${tool.slug} -p 8080:8080 ${tool.repo}:latest`;

  const difficultyMap: Record<string, "Beginner-friendly" | "Intermediate" | "Needs a sysadmin"> = {
    Easy: 'Beginner-friendly',
    Medium: 'Intermediate',
    Moderate: 'Intermediate',
    Advanced: 'Needs a sysadmin'
  };

  const difficulty = difficultyMap[tool.self_host_difficulty] || 'Intermediate';

  return {
    useCases: [
      {
        title: `Primary ${tool.category.replace(/-/g, ' ')} Workloads`,
        description: tool.tagline,
        icon: 'terminal'
      },
      {
        title: 'Autonomous Data Sovereignty',
        description: `Eliminates third-party telemetry, cloud vendor lock-in, and per-seat SaaS costs with self-hosted control.`,
        icon: 'shield'
      },
      {
        title: 'Open Architecture & Interoperability',
        description: `Built on ${tool.language} with standard ${tool.license_spdx} licensing, standard REST/GraphQL APIs, and open data export formats.`,
        icon: 'cpu'
      }
    ],
    howToUse: [
      {
        level: 'Beginner',
        title: 'Quickstart Deployment',
        description: `Deploy a production-ready instance using the recommended installation method.`,
        command: defaultCommand,
        url: tool.website_url || `https://github.com/${tool.repo}`,
        estimatedTime: tool.self_host_difficulty === 'Easy' ? '5 minutes' : '15 minutes'
      },
      {
        level: 'Comfortable',
        title: 'Docker Compose & Persistent Volumes',
        description: `Mount configuration volumes, configure internal environment variables, and route via reverse proxy with TLS.`,
        command: `docker compose up -d`,
        url: `https://github.com/${tool.repo}#installation`,
        estimatedTime: '20 minutes'
      },
      {
        level: 'Developer',
        title: 'Native Source Build & Automation API',
        description: `Build directly from the repository source code using the ${tool.language} toolchain and automate via API tokens.`,
        command: `git clone https://github.com/${tool.repo}.git && cd $(basename "${tool.repo}")`,
        url: `https://github.com/${tool.repo}`,
        estimatedTime: '35 minutes'
      }
    ],
    requirements: {
      ram: tool.self_host_difficulty === 'Easy' ? '512 MB minimum (1 GB recommended)' : '2 GB minimum (4 GB recommended)',
      disk: '10 GB free disk space',
      cpu: '1 vCPU (x86_64 or ARM64)',
      runtime: ['Docker', tool.language.split('/')[0].trim()],
      difficulty
    },
    audience: {
      perfectFor: [
        `Self-hosters and developers looking for a reliable open-source ${tool.category.replace(/-/g, ' ')} solution.`,
        `Teams requiring full custody of data under ${tool.license_spdx} terms with zero external telemetry.`,
        `Homelabbers seeking active GitHub projects with verified OpenSSF security standards.`
      ],
      skipIf: [
        `You want a completely managed zero-maintenance SaaS product with 24/7 commercial SLA support.`,
        tool.self_host_difficulty === 'Advanced'
          ? 'You lack experience troubleshooting Docker container networking, ports, or reverse proxy certificates.'
          : 'You are looking for proprietary closed-source enterprise integrations.'
      ]
    }
  };
}

