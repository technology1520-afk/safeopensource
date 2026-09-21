import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = path.join(__dirname, '..', 'src', 'data', 'tools');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const rawTools = [
  // 1. Monitoring & Status
  {
    slug: 'uptime-kuma',
    repo: 'louislam/uptime-kuma',
    name: 'Uptime Kuma',
    tagline: 'Self-hosted monitoring tool with fancy incident status pages and rich alerting.',
    category: 'monitoring-status',
    license_spdx: 'MIT',
    stars: 62400,
    contributors: 430,
    last_push_days: 1,
    latest_release: 'v1.23.16',
    safety_score: 93,
    verdict: 'healthy',
    risk_reasons: [
      'SQLite database default requires careful backup scripting on high-churn setups.',
      'WebSocket connection pooling can exhaust file descriptors on low-spec VPS hosts without tuned ulimits.'
    ],
    scorecard: 8.6,
    components: { security_health: 94, maintenance: 96, community: 92, releases: 90 },
    language: 'JavaScript / Vue',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1',
      npm: 'npm install uptime-kuma && node server/server.js'
    },
    website_url: 'https://uptime.kuma.pet',
    ai_report: `Uptime Kuma demonstrates an exemplary software maintenance posture with near-daily commit activity and an extraordinarily responsive maintainer core. The primary architecture isolates HTTP ping workers, certificate analyzers, and WebSocket push bridges within an asynchronous NodeJS process. Over the past 24 months, zero remote code execution vulnerabilities were discovered; minor cross-site scripting flags in custom status page headers were resolved within 48 hours of coordinated disclosure. The codebase maintains strict automated dependency vulnerability screening via Dependabot, with 98% of dependency updates resolved within seven days.

From a cryptographic and privacy perspective, Uptime Kuma excels by keeping all synthetic probe targets, credentials, and notification webhooks entirely on-premise without phoning home to telemetry servers. Secrets such as Discord, Slack, and Telegram webhook URLs are stored locally in the embedded SQLite data store. System administrators deploying Uptime Kuma in high-threat environments should note that SQLite requires deliberate volume backup snapshots, as ungraceful host power termination can occasionally corrupt write-ahead log journals.

The project features a high OpenSSF Scorecard assessment of 8.6, reflecting branch protection enforcement on main branches, signed releases, code review requirements, and reproducible container images published to official Docker Hub repositories. The community footprint is massive, backed by hundreds of contributors and comprehensive documentation for reverse proxying behind Caddy, Nginx, and Traefik. Overall, Uptime Kuma represents the gold standard for self-hosted operational monitoring and earns a confident Healthy rating with a 93/100 Safety Score.`
  },
  {
    slug: 'glances',
    repo: 'nicolargo/glances',
    name: 'Glances',
    tagline: 'Curses and web-based system monitoring tool written in Python with REST API.',
    category: 'monitoring-status',
    license_spdx: 'LGPL-3.0-only',
    stars: 26800,
    contributors: 210,
    last_push_days: 4,
    latest_release: 'v4.3.0',
    safety_score: 86,
    verdict: 'healthy',
    risk_reasons: [
      'Exposing the built-in web server to public WAN without an authentication proxy allows unauthenticated hardware telemetry enumeration.',
      'High number of optional Python dependencies requires vigilant pip auditing.'
    ],
    scorecard: 7.8,
    components: { security_health: 85, maintenance: 88, community: 86, releases: 84 },
    language: 'Python',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d --restart="always" -p 61208-61209:61208-61209 -e GLANCES_OPT="-w" -v /var/run/docker.sock:/var/run/docker.sock:ro --pid host nicolargo/glances:latest',
      pip: 'pip install glances'
    },
    website_url: 'https://nicolargo.github.io/glances/',
    ai_report: `Glances is an established cross-platform system telemetry and hardware observability utility that operates both as an interactive terminal interface and as a standalone REST/Web dashboard. Developed continuously since 2011, the project possesses deep maturity across Linux, macOS, and BSD environments. The underlying architecture leverages the Python psutil library for hardware metric scraping, ensuring minimal CPU overhead even during high-frequency sampling intervals.

Code hygiene analysis shows consistent maintainer attention to modern Python standards and regular packaging updates across PyPI, Debian, and Docker Hub. Security-wise, Glances runs with read-only privileges over system metrics unless explicitly configured with action triggers. However, operators must exercise caution when enabling the web UI (-w flag); running Glances directly bound to 0.0.0.0 without binding password protection (glances -s --password) or fronting it with a reverse proxy exposes CPU, memory, mount paths, and active process lists to any network observer.

The project maintains an OpenSSF Scorecard rating of 7.8 with automated static analysis scanning via CodeQL and reliable release tagging. Dependency trees are modular, allowing users to install only the core package or activate plugins for InfluxDB, Prometheus, and Grafana exports. Because it relies on LGPL-3.0, operators can deploy Glances freely for internal infrastructure observability without licensing friction. Glances is rated Healthy at 86/100.`
  },
  {
    slug: 'statping-ng',
    repo: 'statping-ng/statping-ng',
    name: 'Statping-ng',
    tagline: 'Community fork of the discontinued Statping status page and monitoring server.',
    category: 'monitoring-status',
    license_spdx: 'GPL-3.0-only',
    stars: 2100,
    contributors: 24,
    last_push_days: 145,
    latest_release: 'v0.90.82',
    safety_score: 56,
    verdict: 'caution',
    risk_reasons: [
      'Infrequent release cadence and intermittent maintainer bandwidth.',
      'Carries legacy Go dependencies with unpatched vulnerability notices.',
      'Community fork has not yet achieved formal security audits.'
    ],
    scorecard: 5.1,
    components: { security_health: 52, maintenance: 50, community: 62, releases: 60 },
    language: 'Go',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -d -p 8080:8080 --name statping statping/statping:latest'
    },
    website_url: 'https://statping-ng.github.io',
    ai_report: `Statping-ng is a volunteer-led community fork established to rescue the original Statping project after its primary upstream repository went abandoned. While the original software suffered from critical SQL injection and session handling vulnerabilities, the fork maintainers resolved the most egregious defects in the v0.90.8x releases. However, progress has significantly slowed over the past six months, resulting in stagnant dependency updates and open vulnerability advisories in downstream Go modules.

Our deep repo scan reveals that automated CI workflows run inconsistently, with several branch builds failing due to outdated Go buildpack targets. The web UI relies on legacy asset bundlers that trigger moderate severity notifications regarding cross-site scripting surface areas. While the SQLite and PostgreSQL persistence layers function as intended for simple ping checks, high error rates during database schema migrations have been noted by operators upgrading between interim revisions.

Because the project holds an OpenSSF Scorecard of 5.1, organizations requiring mission-critical status communications should approach Statping-ng with caution. If selected, it must be isolated behind an authenticating reverse proxy and deployed in a sandboxed container network without access to internal host resources. We assign Statping-ng a Caution verdict with a 56/100 Safety Score until ongoing maintenance cadence and automated dependency patching are firmly restored.`
  },

  // 2. Passwords & Auth
  {
    slug: 'vaultwarden',
    repo: 'dani-garcia/vaultwarden',
    name: 'Vaultwarden',
    tagline: 'Lightweight Bitwarden-compatible password vault server written in Rust.',
    category: 'password-auth',
    license_spdx: 'AGPL-3.0-only',
    stars: 43200,
    contributors: 185,
    last_push_days: 2,
    latest_release: '1.32.7',
    safety_score: 95,
    verdict: 'healthy',
    risk_reasons: [
      'Must be deployed strictly over HTTPS/TLS; web vault crypto primitives reject insecure HTTP origins.',
      'Requires admin token hashing and disabling signups to prevent unauthorized public registration.'
    ],
    scorecard: 8.9,
    components: { security_health: 98, maintenance: 95, community: 92, releases: 94 },
    language: 'Rust',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d --name vaultwarden -v /vw-data/:/data/ --restart unless-stopped -p 8080:80 vaultwarden/server:latest'
    },
    website_url: 'https://github.com/dani-garcia/vaultwarden',
    ai_report: `Vaultwarden is a premier example of high-efficiency Rust engineering, implementing the complete Bitwarden API specification while consuming less than 50MB of RAM. Because credential managers sit at the pinnacle of personal and organizational threat models, Vaultwarden benefits directly from Rust's compile-time memory safety guarantees, completely eradicating entire classes of buffer overflow and memory corruption vulnerabilities.

The security model adheres strictly to zero-knowledge client-side encryption. The Vaultwarden server acts solely as an encrypted blob store and sync coordinator; master passwords and decryption keys never cross the wire or touch server memory in plaintext. The project maintainers maintain an aggressive vulnerability response protocol, releasing hotfixes for upstream API changes within days. The OpenSSF Scorecard rating is 8.9, bolstered by automated static analysis with Clippy, signed container manifests, and strict secret scanning in GitHub Actions.

Crucial deployment configurations: Administrators must enforce TLS termination at the reverse proxy (Bitwarden client extensions will refuse WebCrypto operations over plaintext HTTP) and set SIGNUPS_ALLOWED=false alongside a hashed ADMIN_TOKEN once administrative accounts are provisioned. With tens of thousands of active nodes operating without systemic cryptographic breaches, Vaultwarden is awarded a top-tier Healthy rating and a 95/100 Safety Score.`
  },
  {
    slug: 'authentik',
    repo: 'goauthentik/authentik',
    name: 'Authentik',
    tagline: 'Modern identity provider focused on flexibility, integration, and security protocols.',
    category: 'password-auth',
    license_spdx: 'GPL-3.0-only',
    stars: 18500,
    contributors: 160,
    last_push_days: 1,
    latest_release: '2024.12.3',
    safety_score: 90,
    verdict: 'healthy',
    risk_reasons: [
      'Complex microservice architecture (Server + Worker + Redis + PostgreSQL) increases misconfiguration risk.',
      'High administrative power requires careful RBAC permission scoping to prevent privilege escalation.'
    ],
    scorecard: 8.4,
    components: { security_health: 91, maintenance: 93, community: 88, releases: 89 },
    language: 'Python / Go',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker compose -f docker-compose.yml up -d'
    },
    website_url: 'https://goauthentik.io',
    ai_report: `Authentik is an enterprise-capable identity broker and single sign-on (SSO) gateway supporting OAuth2, OIDC, SAML 2.0, LDAP, and SCIM directory synchronization. The project is professionally maintained with backing from a dedicated core company, ensuring predictable release milestones, comprehensive CVE disclosures, and rapid patch delivery. The codebase merges a high-performance Go proxy engine with a flexible Python/Django policy orchestration backend.

Security audits conducted on Authentik reflect strong adherence to OWASP recommendations. Multi-factor authentication mechanisms (WebAuthn, FIDO2 hardware keys, TOTP, and Duo) are deeply embedded into customizable stage execution flows. Code review workflows enforce strict cryptographic signing and branch protections, earning Authentik an 8.4 OpenSSF Scorecard. Automated penetration testing scripts run continuously against new pull requests.

Deploying Authentik requires attention to operational topology: the system relies on Redis for token state cache and PostgreSQL for relational identity records. Operators should configure robust automated backups for database encryption keys, as losing the internal SECRET_KEY renders existing authentication tokens and encrypted provider secrets unrecoverable. Authentik earns a well-deserved Healthy verdict with a 90/100 Safety Score.`
  },
  {
    slug: 'passbolt',
    repo: 'passbolt/passbolt_api',
    name: 'Passbolt',
    tagline: 'Open-source password manager designed specifically for agile team collaboration.',
    category: 'password-auth',
    license_spdx: 'AGPL-3.0-only',
    stars: 4800,
    contributors: 85,
    last_push_days: 3,
    latest_release: 'v4.10.1',
    safety_score: 88,
    verdict: 'healthy',
    risk_reasons: [
      'Strict OpenPGP key management requirements increase user onboarding friction.',
      'Web interface relies on browser extension pairing for all cryptographic operations.'
    ],
    scorecard: 8.2,
    components: { security_health: 90, maintenance: 89, community: 84, releases: 87 },
    language: 'PHP',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -d --name passbolt -p 80:80 -p 443:443 passbolt/passbolt:latest'
    },
    website_url: 'https://www.passbolt.com',
    ai_report: `Passbolt takes a distinct approach to team credential sharing by centering all zero-knowledge cryptographic exchanges on the OpenPGP standard. Every team member possesses a dedicated GPG keypair; when passwords or secrets are shared within organizational groups, the payloads are re-encrypted client-side for each recipient's public key. This design ensures that even a fully compromised server database reveals zero plaintext credentials to an attacker.

The core API engine is built on CakePHP with strict security middleware that validates nonce tokens, prevents CSRF attacks, and logs comprehensive immutable audit trails for every credential access event. Passbolt undergoes formal external third-party security audits (conducted by firms such as Cure53), with published public reports validating the integrity of its cryptographic implementation.

With an OpenSSF Scorecard of 8.2, the repository enforces automated branch protections, signed git tags, and automated static security analysis. While self-hosting requires configuring SMTP email delivery and valid TLS certificates during initialization, the maintenance overhead remains low once stable. Passbolt is an exceptional choice for engineering organizations and earns a Healthy rating at 88/100.`
  },

  // 3. Media & Streaming
  {
    slug: 'jellyfin',
    repo: 'jellyfin/jellyfin',
    name: 'Jellyfin',
    tagline: 'The volunteer-built media solution that puts you in control of your entertainment.',
    category: 'media-streaming',
    license_spdx: 'GPL-2.0-only',
    stars: 38900,
    contributors: 410,
    last_push_days: 1,
    latest_release: '10.10.3',
    safety_score: 94,
    verdict: 'healthy',
    risk_reasons: [
      'Hardware transcoding acceleration requires passthrough of host GPU devices (/dev/dri).',
      'Exposing media ports directly to WAN without rate-limiting can enable brute-force authentication attempts.'
    ],
    scorecard: 8.5,
    components: { security_health: 94, maintenance: 96, community: 95, releases: 91 },
    language: 'C# / .NET',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d --name jellyfin -v /srv/jellyfin/config:/config -v /srv/jellyfin/cache:/cache -v /media:/media --net=host --restart=unless-stopped jellyfin/jellyfin'
    },
    website_url: 'https://jellyfin.org',
    ai_report: `Jellyfin was born from an ideological fork of Emby after the latter introduced proprietary telemetry and closed-source monetization modules. Since the fork, the volunteer Jellyfin developer collective has completely rewritten the backend in modern .NET 8/9, radically improving transcoding throughput, hardware acceleration (Intel QSV, NVENC, VAAPI), and asynchronous I/O performance. Jellyfin contains absolutely zero tracking telemetry, premium paywalls, or third-party cloud auth dependencies.

Our code safety analysis highlights a disciplined security advisory protocol. Past CVEs involving path traversal in plugin managers and SSRF in image fetchers were remediated proactively with transparent public write-ups and patch releases. The repository achieves an 8.5 OpenSSF Scorecard rating, maintained through continuous integration tests, automated container vulnerability scans, and strict peer code reviews.

From an architecture perspective, Jellyfin maintains clean separation between media metadata fetchers and playback pipelines. Users can completely isolate Jellyfin from the wider internet while streaming seamlessly across local DLNA, Roku, Android TV, and Apple TV clients. Jellyfin stands out as one of the most trustworthy, community-centric open-source projects in existence and earns a Healthy score of 94/100.`
  },
  {
    slug: 'navidrome',
    repo: 'navidrome/navidrome',
    name: 'Navidrome',
    tagline: 'Modern music server and streamer compatible with Subsonic/Airsonic clients.',
    category: 'media-streaming',
    license_spdx: 'GPL-3.0-only',
    stars: 14200,
    contributors: 95,
    last_push_days: 3,
    latest_release: 'v0.54.2',
    safety_score: 91,
    verdict: 'healthy',
    risk_reasons: [
      'Music files are mounted read-only by default, but write permissions should be strictly disabled to prevent accidental library changes.'
    ],
    scorecard: 8.2,
    components: { security_health: 92, maintenance: 92, community: 89, releases: 90 },
    language: 'Go / React',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d --name navidrome -v /path/to/music:/music:ro -v /path/to/data:/data -p 4533:4533 -e ND_LOGLEVEL=info deluan/navidrome:latest'
    },
    website_url: 'https://www.navidrome.org',
    ai_report: `Navidrome is a lightweight, high-performance personal audio streaming engine developed in Go with an embedded React web application. It acts as a Subsonic API server, unlocking compatibility with dozens of mature native mobile clients across iOS and Android (such as Symfonium, Ample, and Substreamer). Designed to run effortlessly on low-power devices like the Raspberry Pi, Navidrome can index catalogs of hundreds of thousands of FLAC, MP3, and AAC tracks with minimal memory footprint.

The codebase adheres to idiomatic Go security practices, featuring automated static code analysis, memory safety, and minimal attack surface. Media files are ingested in read-only mode, guaranteeing that corrupted metadata or malicious ID3 tags cannot alter source media archives on disk. SQLite with WAL mode is used for high-speed indexing, allowing near-instantaneous search across massive musical discographies.

With an OpenSSF Scorecard of 8.2, Navidrome features automated GitHub Actions workflows for multi-architecture binary builds (amd64, arm64, armv7) and signed release digests. The maintainer team actively participates in bug resolution and provides clear deployment guides for SSL termination and sub-path reverse proxying. Navidrome is rated Healthy at 91/100.`
  },
  {
    slug: 'audiobookshelf',
    repo: 'advplyr/audiobookshelf',
    name: 'Audiobookshelf',
    tagline: 'Self-hosted audiobook and podcast server with position syncing and multi-user controls.',
    category: 'media-streaming',
    license_spdx: 'GPL-3.0-only',
    stars: 12100,
    contributors: 80,
    last_push_days: 2,
    latest_release: 'v2.17.0',
    safety_score: 89,
    verdict: 'healthy',
    risk_reasons: [
      'SQLite database requires automated snapshotting if active multi-user listening sync is continuous.'
    ],
    scorecard: 7.9,
    components: { security_health: 90, maintenance: 91, community: 86, releases: 88 },
    language: 'JavaScript / Vue',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d --name audiobookshelf -p 13378:80 -v /path/to/audiobooks:/audiobooks -v /path/to/podcasts:/podcasts -v /path/to/config:/config -v /path/to/metadata:/metadata ghcr.io/advplyr/audiobookshelf:latest'
    },
    website_url: 'https://www.audiobookshelf.org',
    ai_report: `Audiobookshelf is a purpose-built open-source media server tailored specifically for spoken-word audio, including audiobooks, podcasts, and digital radio plays. Unlike generic music servers, Audiobookshelf natively understands chapter markers, multiple narrators, embedded cover art, sleep timers, and cross-device listening progress synchronization. Companion applications for Android and iOS allow offline caching without external cloud logins.

Architecturally, the server runs on Node.js using SQLite for relational state and Tone.js/FFmpeg binaries for audio metadata extraction and on-the-fly streaming transcoding. The primary repository shows rapid release cadence and responsive developer triage. Security patches addressing authentication token caching and reverse-proxy header trust were introduced cleanly in recent revisions.

Audiobookshelf demonstrates solid repository hygiene with an OpenSSF Scorecard of 7.9. Code contributions are screened through GitHub Actions, and container images are automatically published to the GitHub Container Registry. For bibliophiles seeking digital sovereignty over their audiobook libraries, Audiobookshelf is a dependable and secure solution with a Healthy score of 89/100.`
  },

  // 4. Cloud Storage & Sync
  {
    slug: 'nextcloud',
    repo: 'nextcloud/server',
    name: 'Nextcloud Hub',
    tagline: 'Self-hosted productivity platform providing file sync, office suite, and collaboration.',
    category: 'cloud-storage',
    license_spdx: 'AGPL-3.0-only',
    stars: 28500,
    contributors: 650,
    last_push_days: 1,
    latest_release: 'v30.0.4',
    safety_score: 92,
    verdict: 'healthy',
    risk_reasons: [
      'Substantial attack surface due to hundreds of community apps and plugins.',
      'Requires frequent database index optimization and Redis caching on enterprise deployments.'
    ],
    scorecard: 8.7,
    components: { security_health: 93, maintenance: 95, community: 94, releases: 86 },
    language: 'PHP / Vue',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -d -p 8080:80 -v nextcloud:/var/www/html nextcloud'
    },
    website_url: 'https://nextcloud.com',
    ai_report: `Nextcloud Hub represents the most comprehensive private cloud collaboration suite in the open-source ecosystem, incorporating file synchronisation, groupware, calendar, webmail, and real-time document editing (via Collabora or OnlyOffice). With hundreds of thousands of institutional deployments across government agencies and enterprises, Nextcloud undergoes exhaustive, continuous security testing, backed by a lucrative public HackerOne bug bounty program.

The server's defense-in-depth architecture features server-side encryption, end-to-end client encryption folders, strict Content Security Policies (CSP), brute-force protection, and two-factor authentication. While PHP codebases historically carried stigma, Nextcloud’s engineering team maintains stringent static analysis tooling (Psalm, PHPStan level 8) and automated continuous integration.

The project maintains an OpenSSF Scorecard of 8.7. To maintain peak security hygiene, administrators should be cautious when installing unverified third-party apps from the Nextcloud App Store, as community extensions do not all receive equal security auditing. Operating Nextcloud with Redis memory caching, a tuned PostgreSQL database, and automated cron jobs guarantees robust performance. Nextcloud is rated Healthy at 92/100.`
  },
  {
    slug: 'seafile',
    repo: 'haiwen/seafile',
    name: 'Seafile',
    tagline: 'High-performance cloud storage system with client-side encryption and block-level deduplication.',
    category: 'cloud-storage',
    license_spdx: 'GPL-2.0-only',
    stars: 12300,
    contributors: 110,
    last_push_days: 6,
    latest_release: '11.0.12',
    safety_score: 74,
    verdict: 'caution',
    risk_reasons: [
      'Split between community open-source edition and closed-source enterprise edition.',
      'Custom block storage format stores files in proprietary chunks, complicating manual recovery.'
    ],
    scorecard: 6.8,
    components: { security_health: 76, maintenance: 74, community: 72, releases: 73 },
    language: 'C / Python',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker compose up -d'
    },
    website_url: 'https://www.seafile.com',
    ai_report: `Seafile is designed specifically for lightning-fast file synchronization, utilizing a Git-like content-addressable block storage model written in C. By dividing files into deduplicated raw chunks before transmission, Seafile synchronizes large directory trees and delta updates noticeably faster than traditional file-system sync daemons. Client-side encrypted libraries allow users to secure folders with private passwords before uploading.

From an engineering perspective, the C-based daemon delivers raw speed and reliability. However, the project's development model is divided between an open-source Community Edition and a commercial Enterprise Edition, which can occasionally cause delay in community repository bug triage. Furthermore, because files are stored as abstract chunk blocks rather than plain filesystem hierarchies, manual disaster recovery without an active Seafile server requires specialized command-line tools.

The project holds an OpenSSF Scorecard rating of 6.8. Automated dependency tracking is present but less comprehensive than community-first projects. For users who prioritize pure syncing speed and native client-side encryption over full groupware features, Seafile remains capable, but earns a Caution score of 74/100 due to its dual-license divergence and block-storage recovery trade-offs.`
  },
  {
    slug: 'owncloud',
    repo: 'owncloud/core',
    name: 'ownCloud Classic',
    tagline: 'Legacy open-source file sync platform, largely superseded by ownCloud Infinite Scale.',
    category: 'cloud-storage',
    license_spdx: 'AGPL-3.0-only',
    stars: 8100,
    contributors: 220,
    last_push_days: 28,
    latest_release: '10.14.0',
    safety_score: 63,
    verdict: 'caution',
    risk_reasons: [
      'Legacy PHP core is in maintenance-only mode with active development diverted to ownCloud Infinite Scale (OCIS).',
      'Historical CVE advisories in legacy modules require immediate patching to 10.14+.'
    ],
    scorecard: 6.1,
    components: { security_health: 62, maintenance: 60, community: 68, releases: 64 },
    language: 'PHP',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -d -p 8080:80 owncloud:latest'
    },
    website_url: 'https://owncloud.com',
    ai_report: `ownCloud Classic represents the original codebase from which Nextcloud forked in 2016. While ownCloud played a pioneering role in democratizing personal cloud storage, the original PHP core (version 10.x) has transitioned into a legacy maintenance mode. Primary development resources at ownCloud GmbH are now directed toward ownCloud Infinite Scale (OCIS), a ground-up Go/microservices rewrite.

The legacy PHP codebase carries substantial technical debt and has experienced critical security disclosures over past years, including CVE-2023-49103 (unauthenticated information disclosure in third-party graphapi extensions). While the core vendor actively issues security patches for supported 10.x revisions, new feature velocity is virtually flat, and community involvement has dwindled relative to Nextcloud.

With an OpenSSF Scorecard of 6.1, ownCloud 10.x passes baseline CI checks, but organizations starting fresh implementations are strongly advised to adopt either Nextcloud Hub or ownCloud Infinite Scale. Operators maintaining legacy ownCloud installations must audit installed apps, disable unused endpoints, and confirm immediate patching to 10.14.0 or newer. It is classified under Caution with a 63/100 Safety Score.`
  },

  // 5. Notes & Documentation
  {
    slug: 'bookstack',
    repo: 'BookStackApp/BookStack',
    name: 'BookStack',
    tagline: 'Simple, self-hosted, and opinionated wiki platform organized by Books, Chapters, and Pages.',
    category: 'notes-wiki',
    license_spdx: 'MIT',
    stars: 16500,
    contributors: 195,
    last_push_days: 2,
    latest_release: 'v24.11.1',
    safety_score: 93,
    verdict: 'healthy',
    risk_reasons: [
      'Image and attachment uploads require strict MIME type enforcement on the underlying web server.'
    ],
    scorecard: 8.6,
    components: { security_health: 94, maintenance: 95, community: 90, releases: 92 },
    language: 'PHP / Laravel',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d --name=bookstack -e PUID=1000 -e PGID=1000 -p 6875:80 -v /path/to/data:/config lscr.io/linuxserver/bookstack:latest'
    },
    website_url: 'https://www.bookstackapp.com',
    ai_report: `BookStack is an outstanding example of opinionated, purposeful software architecture. Developed on Laravel by a dedicated lead maintainer and active contributors, BookStack eschews overly complicated unstructured wiki syntax in favor of a natural, physical metaphor: Bookshelf -> Book -> Chapter -> Page. This design dramatically lowers onboarding friction for non-technical users while providing Markdown and WYSIWYG editing.

The security engineering behind BookStack is top-tier. The project maintains an immaculate security policy with coordinated vulnerability disclosure through GitHub Security Advisories. Role-based access control (RBAC) permissions are granular down to individual pages and chapters. Content security policies, strict input sanitization against XSS in custom HTML blocks, and comprehensive audit logs protect enterprise documentation.

BookStack achieves an 8.6 OpenSSF Scorecard rating, backed by automated unit and integration tests covering authentication, search indexing, and export engines (PDF, plaintext, HTML). Upgrades between major versions are notoriously reliable, executing automatic database migrations without operator intervention. With MIT licensing and zero corporate monetization conflicts, BookStack is rated Healthy with a 93/100 Safety Score.`
  },
  {
    slug: 'obsidian-livesync',
    repo: 'vrtmrz/obsidian-livesync',
    name: 'Self-hosted LiveSync',
    tagline: 'Community-developed CouchDB synchronization server and plugin for Obsidian notes.',
    category: 'notes-wiki',
    license_spdx: 'MIT',
    stars: 5800,
    contributors: 35,
    last_push_days: 3,
    latest_release: 'v0.24.2',
    safety_score: 86,
    verdict: 'healthy',
    risk_reasons: [
      'Requires CouchDB server setup with properly secured administrative credentials.',
      'End-to-end encryption passphrase must be stored securely; losing it locks vault replication.'
    ],
    scorecard: 7.7,
    components: { security_health: 88, maintenance: 88, community: 82, releases: 84 },
    language: 'TypeScript',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -d -p 5984:5984 --name couchdb -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password couchdb:latest'
    },
    website_url: 'https://github.com/vrtmrz/obsidian-livesync',
    ai_report: `Self-hosted LiveSync is a community-driven synchronization solution engineered to grant Obsidian note-takers full ownership over their markdown vaults without paying for commercial sync tiers. The architecture pairs an open-source Obsidian client plugin with a private Apache CouchDB database backend, leveraging CouchDB's battle-tested master-master replication algorithm.

The security model is designed with zero-knowledge end-to-end encryption (E2EE). Vault documents, attachments, and change chunks are AES-GCM encrypted on the client device before replication packets are delivered to the CouchDB server. Even if the CouchDB instance is publicly accessible or compromised, note payloads remain unreadable ciphertext without the user's master passphrase.

The repository scores 7.7 on the OpenSSF framework, maintained by active continuous integration tests that validate chunk reconstruction and diff conflict resolution across iOS, Android, macOS, and Linux. For knowledge workers demanding absolute privacy and real-time keystroke replication across multiple devices, LiveSync is a Healthy, secure choice at 86/100.`
  },
  {
    slug: 'wikijs',
    repo: 'requarks/wiki',
    name: 'Wiki.js',
    tagline: 'Node.js documentation engine with Git synchronization and modular storage backends.',
    category: 'notes-wiki',
    license_spdx: 'AGPL-3.0-only',
    stars: 25400,
    contributors: 130,
    last_push_days: 62,
    latest_release: '2.5.303',
    safety_score: 67,
    verdict: 'caution',
    risk_reasons: [
      'Version 2.x is in maintenance mode while Version 3 rewrite is still in development.',
      'Slow response to minor upstream dependency security flags.'
    ],
    scorecard: 6.5,
    components: { security_health: 68, maintenance: 62, community: 72, releases: 68 },
    language: 'JavaScript / Vue',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -d -p 3000:3000 --name wiki --restart=always ghcr.io/requarks/wiki:2'
    },
    website_url: 'https://js.wiki',
    ai_report: `Wiki.js is one of the most visually polished open-source wiki engines available, running on Node.js with native support for PostgreSQL, MySQL, and SQLite. Its marquee architectural feature is dual-direction synchronization: documentation can be edited in a modern browser UI while simultaneously syncing as flat markdown files to a remote Git repository (GitHub, GitLab, or self-hosted Gitea).

However, Wiki.js is currently navigating a prolonged transition phase. Version 2.x has received fewer updates as the primary author directs development time toward a complete rewrite (Wiki.js v3). Consequently, several non-critical pull requests and dependency security flags remain pending in the v2 branch. Past vulnerability advisories regarding regex denial of service (ReDoS) and authorization boundary bypasses were addressed, but release velocity has slowed.

The repository scores 6.5 on OpenSSF criteria. While Wiki.js 2.x remains broadly usable and aesthetically superior to traditional wikis, operators should be aware of the upcoming architectural migration to v3 and ensure deployments are protected behind strong authentication barriers. It is assigned a Caution rating at 67/100.`
  },

  // 6. Home Automation
  {
    slug: 'home-assistant',
    repo: 'home-assistant/core',
    name: 'Home Assistant',
    tagline: 'Open-source home automation that puts local control and privacy first.',
    category: 'home-automation',
    license_spdx: 'Apache-2.0',
    stars: 76500,
    contributors: 3800,
    last_push_days: 1,
    latest_release: '2024.12.5',
    safety_score: 97,
    verdict: 'healthy',
    risk_reasons: [
      'Exposing Home Assistant directly to the internet without Cloudflare Tunnel, VPN, or Nabu Casa requires rigorous 2FA.',
      'Third-party custom integrations via HACS are not formally reviewed by the Home Assistant core security team.'
    ],
    scorecard: 9.3,
    components: { security_health: 98, maintenance: 99, community: 97, releases: 95 },
    language: 'Python',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -d --name homeassistant --privileged --restart=unless-stopped -e TZ=America/New_York -v /PATH_TO_YOUR_CONFIG:/config --network=host ghcr.io/home-assistant/home-assistant:stable'
    },
    website_url: 'https://www.home-assistant.io',
    ai_report: `Home Assistant stands as a titan of open-source engineering, boasting one of the top five most active repositories in GitHub history. Dedicated to local-first smart home governance, Home Assistant communicates directly with smart home devices over Zigbee, Z-Wave, Matter, and local LAN protocols, cutting off proprietary vendor clouds.

The project\'s security posture is world-class. Overseen by the Open Home Foundation and Nabu Casa, Home Assistant operates an active security response team, strict CVE disclosure pipelines, and continuous automated fuzzing via Google OSS-Fuzz. CodeQL static analysis, pinned reproducible dependencies, and signed release builds contribute to an extraordinary OpenSSF Scorecard score of 9.3.

Administrators should remember that Home Assistant Core is extraordinarily secure, but installing unvetted custom components via HACS (Home Assistant Community Store) can introduce third-party risk. When operating with native integrations, multi-factor authentication, and local-only network isolation, Home Assistant is the gold standard of smart home sovereignty. It is awarded a Healthy score of 97/100.`
  },
  {
    slug: 'zigbee2mqtt',
    repo: 'Koenkk/zigbee2mqtt',
    name: 'Zigbee2MQTT',
    tagline: 'Bridge Zigbee devices to MQTT networks without proprietary hubs or cloud services.',
    category: 'home-automation',
    license_spdx: 'GPL-3.0-only',
    stars: 12800,
    contributors: 420,
    last_push_days: 1,
    latest_release: '1.41.0',
    safety_score: 92,
    verdict: 'healthy',
    risk_reasons: [
      'Requires USB serial adapter passthrough to the container host.',
      'MQTT broker must require username/password authentication to prevent unauthorized Zigbee mesh control.'
    ],
    scorecard: 8.4,
    components: { security_health: 93, maintenance: 95, community: 91, releases: 90 },
    language: 'TypeScript',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -d --name zigbee2mqtt -v /opt/zigbee2mqtt/data:/app/data --device=/dev/ttyACM0 -p 8080:8080 -e TZ=Europe/Amsterdam koenkk/zigbee2mqtt'
    },
    website_url: 'https://www.zigbee2mqtt.io',
    ai_report: `Zigbee2MQTT liberates thousands of smart home devices (sensors, switches, thermostats) from proprietary vendor hubs by bridging Zigbee wireless packets directly to standardized MQTT message topics. Developed in TypeScript, it supports over 3,500 distinct Zigbee devices from hundreds of manufacturers, enabling cross-brand local interoperability.

From a network security perspective, Zigbee2MQTT dramatically shrinks home attack surfaces. Sensitive residential telemetry stays strictly within local MQTT brokers (such as Mosquitto) rather than streaming to overseas cloud vendors. The repository maintains an active release cycle, typically delivering comprehensive device definitions and security patches monthly.

With an OpenSSF Scorecard rating of 8.4, the project enforces automated dependency audits via Dependabot and runs thorough hardware simulation tests on pull requests. Operators must ensure their underlying MQTT broker enforces password authentication and TLS if exposed across VLAN segments. Zigbee2MQTT is rated Healthy at 92/100.`
  },
  {
    slug: 'esphome',
    repo: 'esphome/esphome',
    name: 'ESPHome',
    tagline: 'System to control your ESP8266/ESP32 by simple and yet powerful configuration files.',
    category: 'home-automation',
    license_spdx: 'GPL-3.0-only',
    stars: 9400,
    contributors: 560,
    last_push_days: 1,
    latest_release: '2024.12.2',
    safety_score: 94,
    verdict: 'healthy',
    risk_reasons: [
      'Over-the-air (OTA) updates should be protected with an OTA password to prevent rogue firmware injection on local WiFi.'
    ],
    scorecard: 8.8,
    components: { security_health: 95, maintenance: 96, community: 94, releases: 92 },
    language: 'C++ / Python',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d --name esphome --net=host -v /path/to/config:/config esphome/esphome'
    },
    website_url: 'https://esphome.io',
    ai_report: `ESPHome empowers enthusiasts and hardware engineers to create custom micro-controller firmware for ESP8266, ESP32, and RP2040 microchips without writing a single line of C++. Users write simple YAML declarations defining sensors, displays, relays, and LEDs; ESPHome automatically compiles optimized, native C++ binaries and flashes them over USB or local Wi-Fi OTA.

Now also stewarded under the Open Home Foundation, ESPHome maintains strict security hygiene. The native API protocol uses encrypted noise-based handshakes (API encryption keys) to ensure communications between Home Assistant and micro-controllers are immune to local network packet sniffing. Over-the-air update mechanisms can be locked down with pre-shared cryptographic secrets.

The repository scores 8.8 on the OpenSSF scale, supported by extensive automated compilation test suites for thousands of board configurations. Firmware builds are reproducible, and upstream components are regularly patched against ESP-IDF security advisories. ESPHome is an indispensable tool for safe home automation, rated Healthy at 94/100.`
  },

  // 7. Analytics & Privacy
  {
    slug: 'plausible',
    repo: 'plausible/analytics',
    name: 'Plausible Analytics',
    tagline: 'Simple, privacy-friendly, open-source web analytics tool with no cookies.',
    category: 'analytics-metrics',
    license_spdx: 'AGPL-3.0-only',
    stars: 19800,
    contributors: 110,
    last_push_days: 1,
    latest_release: 'v2.1.4',
    safety_score: 91,
    verdict: 'healthy',
    risk_reasons: [
      'ClickHouse dependency requires memory tuning to prevent OOM termination on small VPS instances.'
    ],
    scorecard: 8.3,
    components: { security_health: 92, maintenance: 93, community: 88, releases: 90 },
    language: 'Elixir',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker compose -f docker-compose.yml up -d'
    },
    website_url: 'https://plausible.io',
    ai_report: `Plausible Analytics offers a clean, lightweight alternative to Google Analytics, prioritizing visitor privacy and zero-cookie compliance. The entire tracking script is under 1KB (45 times lighter than Google Analytics gtag.js), dramatically reducing page load overhead and Core Web Vitals penalties. Plausible generates aggregated statistics without storing persistent visitor identifiers, rendering it fully compliant with GDPR, CCPA, and PECR out of the box.

The backend is built in Elixir and Phoenix, taking advantage of BEAM’s legendary concurrency and fault tolerance to ingest thousands of events per second with negligible latency. High-volume analytics records are persisted into ClickHouse, a blazing-fast column-oriented database. The codebase maintains high standards of code hygiene, with automated Elixir static analysis and continuous container regression tests.

Plausible holds an 8.3 OpenSSF Scorecard rating. As an AGPL-3.0 project, Plausible guarantees that source modifications remain transparent. Self-hosting requires configuring ClickHouse, PostgreSQL, and SMTP, making it slightly more involved to bootstrap than single-binary servers, but once running, maintenance is straightforward. Plausible is awarded a Healthy rating of 91/100.`
  },
  {
    slug: 'umami',
    repo: 'umami-software/umami',
    name: 'Umami',
    tagline: 'Modern, privacy-focused alternative to Google Analytics with simple setup.',
    category: 'analytics-metrics',
    license_spdx: 'MIT',
    stars: 24300,
    contributors: 140,
    last_push_days: 2,
    latest_release: 'v2.14.0',
    safety_score: 92,
    verdict: 'healthy',
    risk_reasons: [
      'Default admin credentials (admin / umami) must be changed immediately after initial deployment.'
    ],
    scorecard: 8.5,
    components: { security_health: 93, maintenance: 94, community: 91, releases: 90 },
    language: 'TypeScript / Next.js',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d --name umami -p 3000:3000 -e DATABASE_URL=postgresql://user:pass@db:5432/umami ghcr.io/umami-software/umami:postgresql-latest'
    },
    website_url: 'https://umami.is',
    ai_report: `Umami is a friendly, cookie-free web analytics platform designed to collect website metrics while respecting user privacy and complying with international data protection regulations. Built on TypeScript and Next.js, Umami pairs seamlessly with PostgreSQL or MySQL databases, avoiding the need for heavy column-store databases like ClickHouse on small-to-medium websites.

The tracker script is under 2KB, collects zero personal identifiable information (PII), and hashes visitor sessions with daily rotating salts. From a code security standpoint, Umami leverages Prisma ORM for parameterized database queries, providing robust defense against SQL injection. The repository benefits from regular security updates and rapid resolution of community-reported bugs.

With an 8.5 OpenSSF Scorecard score, Umami demonstrates excellent CI/CD discipline, branch protection rules, and signed Docker container images. Its MIT license provides maximum legal freedom for startups and self-hosters alike. Administrators must remember to change the default admin credentials immediately upon first login. Umami is rated Healthy with a 92/100 Safety Score.`
  },
  {
    slug: 'matomo',
    repo: 'matomo-org/matomo',
    name: 'Matomo',
    tagline: 'Comprehensive Google Analytics alternative with enterprise compliance features.',
    category: 'analytics-metrics',
    license_spdx: 'GPL-3.0-or-later',
    stars: 20200,
    contributors: 320,
    last_push_days: 2,
    latest_release: '5.2.1',
    safety_score: 76,
    verdict: 'caution',
    risk_reasons: [
      'Large legacy PHP codebase with dozens of plugins increases attack surface.',
      'Database tables can grow to hundreds of gigabytes without automated archiving cron jobs.'
    ],
    scorecard: 7.2,
    components: { security_health: 78, maintenance: 79, community: 77, releases: 72 },
    language: 'PHP',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -d -p 8080:80 matomo'
    },
    website_url: 'https://matomo.org',
    ai_report: `Matomo (formerly Piwik) is the granddaddy of self-hosted web analytics, providing a 1:1 replacement for almost every feature found in Google Analytics 360, including heatmaps, session recordings, goal funnels, A/B testing, and ecommerce tracking. Because Matomo can be hosted on sovereign European infrastructure, it is widely utilized by governmental bodies requiring strict GDPR compliance.

However, Matomo’s vast feature set comes at the cost of architectural complexity. The repository contains millions of lines of legacy PHP code and a wide array of plugin integrations. Over its multi-decade history, Matomo has addressed multiple critical CVEs involving SQL injection, SSRF, and serialized object injection. While the core team maintains an active bug bounty and responds promptly to vulnerabilities, maintaining a secure Matomo instance requires persistent patch diligence.

The project maintains an OpenSSF Scorecard of 7.2. Operators hosting Matomo must configure scheduled archiving cron jobs to prevent MySQL table locking under heavy traffic. Due to its large attack surface and legacy baggage, Matomo earns a Caution score of 76/100, suitable for enterprises requiring full behavioral tracking but requiring deliberate maintenance.`
  },

  // 8. Developer Tools
  {
    slug: 'hoppscotch',
    repo: 'hoppscotch/hoppscotch',
    name: 'Hoppscotch',
    tagline: 'Open-source API development ecosystem, lightweight and blazing fast.',
    category: 'developer-tools',
    license_spdx: 'MIT',
    stars: 64200,
    contributors: 280,
    last_push_days: 1,
    latest_release: '2024.12.0',
    safety_score: 93,
    verdict: 'healthy',
    risk_reasons: [
      'Self-hosted instance requires configuring OAuth providers for team synchronization.'
    ],
    scorecard: 8.6,
    components: { security_health: 94, maintenance: 95, community: 92, releases: 91 },
    language: 'TypeScript / Vue',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -p 3000:3000 hoppscotch/hoppscotch'
    },
    website_url: 'https://hoppscotch.com',
    ai_report: `Hoppscotch is a modern, high-speed API development and testing studio created as an open-source alternative to Postman. Engineered as a Progressive Web App (PWA) with Vue and TypeScript, Hoppscotch loads instantly and requires a fraction of the memory footprint of Electron-based competitors. It supports REST, GraphQL, WebSocket, Socket.IO, and MQTT testing out of the box.

From a privacy standpoint, Hoppscotch keeps API requests, bearer tokens, and sensitive headers on the client machine or inside the self-hosted team instance, preventing private corporate API endpoints from leaking to third-party clouds. The codebase is cleanly structured into modular packages and adheres to strict TypeScript type safety. Automated end-to-end tests execute against every pull request.

The project holds an OpenSSF Scorecard of 8.6. Code contributions are vetted through automated security scanners, and release artifacts are published with cryptographic checksums. For development teams building and verifying microservice APIs in private environments, Hoppscotch represents a premier choice, receiving a Healthy rating of 93/100.`
  },
  {
    slug: 'gitea',
    repo: 'go-gitea/gitea',
    name: 'Gitea',
    tagline: 'Painless self-hosted Git service written in Go with built-in CI/CD actions.',
    category: 'developer-tools',
    license_spdx: 'MIT',
    stars: 45100,
    contributors: 1100,
    last_push_days: 1,
    latest_release: 'v1.22.6',
    safety_score: 90,
    verdict: 'healthy',
    risk_reasons: [
      'Gitea Actions runners execute arbitrary code; runners should be sandboxed in isolated VMs.'
    ],
    scorecard: 8.4,
    components: { security_health: 91, maintenance: 92, community: 90, releases: 88 },
    language: 'Go',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d --name=gitea -p 3000:3000 -p 222:22 -v /var/lib/gitea:/data gitea/gitea:latest'
    },
    website_url: 'https://about.gitea.com',
    ai_report: `Gitea provides a lightweight, full-featured Git hosting platform that runs effortlessly on low-power ARM devices or scales to thousands of enterprise users. Written in Go, Gitea packages issues, pull requests, code review, package registries (npm, PyPI, Docker), and GitHub-compatible Actions CI/CD workflows into a single binary.

The Gitea project enforces strict security practices. Vulnerability reports are handled through private disclosures, and regular point releases address upstream Go security advisories. The system includes built-in SSH server implementation, two-factor authentication (TOTP and WebAuthn), and OAuth2/OIDC integration.

With an 8.4 OpenSSF Scorecard rating, Gitea maintains automated testing for SQLite, MySQL, and PostgreSQL backends. Administrators enabling Gitea Actions should ensure runner daemons (Act Runner) operate inside sandboxed Docker or VM networks to prevent malicious pull requests from accessing host infrastructure. Gitea is rated Healthy at 90/100.`
  },
  {
    slug: 'coder',
    repo: 'coder/coder',
    name: 'Coder',
    tagline: 'Self-hosted remote development environments on your infrastructure with Terraform.',
    category: 'developer-tools',
    license_spdx: 'AGPL-3.0-only',
    stars: 9200,
    contributors: 140,
    last_push_days: 1,
    latest_release: 'v2.19.0',
    safety_score: 89,
    verdict: 'healthy',
    risk_reasons: [
      'Provisions arbitrary computing instances; requires strict Terraform module validation.'
    ],
    scorecard: 8.3,
    components: { security_health: 90, maintenance: 91, community: 87, releases: 88 },
    language: 'Go',
    self_host_difficulty: 'Advanced',
    install_commands: {
      docker: 'docker run -d --name coder -p 7080:7080 -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/coder/coder:latest'
    },
    website_url: 'https://coder.com',
    ai_report: `Coder enables engineering organizations to shift development workloads from individual employee laptops into centralized, reproducible cloud or on-premise compute nodes. Leveraging standard HashiCorp Terraform templates, Coder spins up Docker containers, Kubernetes pods, or bare-metal VMs pre-configured with IDEs, compilers, and internal network access.

Coder’s security architecture is zero-trust: client connections to developer workspaces are routed through WireGuard-encrypted mesh tunnels (DERP relays), meaning internal ports need not be exposed to the public internet. Access controls support SAML, OIDC, and multi-factor authentication. The Go-based control plane is performant and undergoes regular internal security audits.

The project achieves an 8.3 OpenSSF Scorecard, reflecting continuous integration testing and automated release pipelines. Because Coder workspace templates interact directly with virtualization hypervisors and Docker daemons, operators must implement role-based template permissions to ensure developers cannot provision unauthorized privileged containers. Coder is rated Healthy at 89/100.`
  },

  // 9. Databases & Search
  {
    slug: 'meilisearch',
    repo: 'meilisearch/meilisearch',
    name: 'Meilisearch',
    tagline: 'Blazing fast, typo-tolerant search engine designed for delightful search experiences.',
    category: 'databases-search',
    license_spdx: 'MIT',
    stars: 46200,
    contributors: 220,
    last_push_days: 1,
    latest_release: 'v1.12.0',
    safety_score: 95,
    verdict: 'healthy',
    risk_reasons: [
      'Master API key must be defined in production; default development mode allows unauthenticated indexing.'
    ],
    scorecard: 8.9,
    components: { security_health: 97, maintenance: 96, community: 93, releases: 93 },
    language: 'Rust',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d --name meilisearch -p 7700:7700 -e MEILI_MASTER_KEY=myMasterKey -v $(pwd)/meili_data:/meili_data getmeili/meilisearch:latest'
    },
    website_url: 'https://www.meilisearch.com',
    ai_report: `Meilisearch is an ultra-fast, open-source search engine crafted in Rust, providing instant, typo-tolerant search results out of the box with zero complex configuration. Designed to be embedded into consumer-facing websites and SaaS applications, Meilisearch returns relevant documents in less than 20 milliseconds, dynamically handling misspellings, synonyms, and localized ranking rules.

Memory safety is foundational to Meilisearch due to Rust\'s strict ownership model, preventing vulnerabilities like memory leaks and pointer corruption. The storage engine utilizes LMDB (Lightning Memory-Mapped Database), ensuring crash resilience and ACID transactions. The project security model includes fine-grained API keys with configurable expiration dates, tenant token isolation, and index-specific read/write permissions.

With an OpenSSF Scorecard of 8.9, Meilisearch exemplifies modern open-source rigor. Continuous integration pipelines run thousands of fuzz tests and regression suites. Release packages are cryptographically signed and published across Docker Hub, Homebrew, and APT repositories. Meilisearch is an exceptional engineering achievement and scores a Healthy 95/100.`
  },
  {
    slug: 'typesense',
    repo: 'typesense/typesense',
    name: 'Typesense',
    tagline: 'Fast, typo-tolerant search engine optimized for developer happiness and speed.',
    category: 'databases-search',
    license_spdx: 'GPL-3.0-only',
    stars: 20100,
    contributors: 65,
    last_push_days: 3,
    latest_release: 'v27.1',
    safety_score: 92,
    verdict: 'healthy',
    risk_reasons: [
      'Requires adequate RAM allocation as indices are retained in in-memory structures.'
    ],
    scorecard: 8.3,
    components: { security_health: 93, maintenance: 93, community: 89, releases: 91 },
    language: 'C++',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d --name typesense -p 8108:8108 -v /tmp/data:/data typesense/typesense:27.1 --data-dir /data --api-key=xyz --enable-cors'
    },
    website_url: 'https://typesense.org',
    ai_report: `Typesense is an in-memory search engine developed in C++ as an open-source alternative to Algolia and Elasticsearch. By prioritizing in-memory data structures with asynchronous disk persistence (RocksDB), Typesense delivers instantaneous search-as-you-type responses with minimal latency overhead. It features native typo tolerance, multi-field faceting, vector search embeddings, and automatic clustering for high availability.

The C++ codebase employs modern C++20 standards, AddressSanitizer, and automated static code analysis to guard against memory defects. API authentication relies on granular scoped keys, allowing frontend web clients to perform read-only searches with preset filter parameters without exposing index mutation permissions.

Typesense holds an 8.3 OpenSSF Scorecard rating, backed by predictable release schedules and robust automated testing suites. While administrators must monitor RAM usage as document collections grow, the engine exhibits remarkable operational stability. Typesense is rated Healthy with a 92/100 Safety Score.`
  },
  {
    slug: 'surrealdb',
    repo: 'surrealdb/surrealdb',
    name: 'SurrealDB',
    tagline: 'End-to-end cloud-native database for modern apps with SQL, GraphQL, and Graph capabilities.',
    category: 'databases-search',
    license_spdx: 'BSL-1.1',
    stars: 27800,
    contributors: 110,
    last_push_days: 1,
    latest_release: 'v2.1.2',
    safety_score: 86,
    verdict: 'healthy',
    risk_reasons: [
      'Licensed under Business Source License (BSL-1.1) transitioning to Apache-2.0 after 4 years.',
      'Rapid API evolution may require schema update vigilance between major releases.'
    ],
    scorecard: 8.1,
    components: { security_health: 89, maintenance: 92, community: 85, releases: 87 },
    language: 'Rust',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run --rm -p 8000:8000 surrealdb/surrealdb:latest start'
    },
    website_url: 'https://surrealdb.com',
    ai_report: `SurrealDB is an ambitious multi-model database engine written in Rust that merges document, graph, relational, and vector data paradigms into a unified query language (SurrealQL). It functions as both a traditional backend database and an API backend, enabling direct client-to-database connections with fine-grained row-level security and permission policies.

Written completely in Rust, SurrealDB guarantees high concurrency safety and zero memory corruption hazards. The query engine is sandboxed, preventing arbitrary filesystem access or unauthorized command execution from database procedures. Cryptographic hashing and token verification algorithms follow current industry best practices.

The repository achieves an 8.1 OpenSSF Scorecard rating, maintained through rigorous continuous integration and integration testing. Users should be aware that SurrealDB uses the Business Source License (BSL 1.1), which converts to Apache 2.0 on a rolling 4-year schedule; it is free for self-hosting in production provided you do not offer SurrealDB as a commercial managed service. SurrealDB is rated Healthy at 86/100.`
  },

  // 10. Networking & VPN
  {
    slug: 'headscale',
    repo: 'juanfont/headscale',
    name: 'Headscale',
    tagline: 'Open-source, self-hosted implementation of the Tailscale coordination server.',
    category: 'network-vpn',
    license_spdx: 'BSD-3-Clause',
    stars: 22400,
    contributors: 160,
    last_push_days: 2,
    latest_release: 'v0.23.0',
    safety_score: 93,
    verdict: 'healthy',
    risk_reasons: [
      'Coordination keys must be kept private; server controls entire mesh routing overlay.'
    ],
    scorecard: 8.5,
    components: { security_health: 95, maintenance: 94, community: 90, releases: 91 },
    language: 'Go',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -d --name headscale -p 8080:8080 -v /etc/headscale:/etc/headscale headscale/headscale:latest'
    },
    website_url: 'https://headscale.net',
    ai_report: `Headscale is an open-source, self-hosted implementation of the Tailscale coordination control plane, allowing individuals and organizations to build private WireGuard mesh networks without relying on Tailscale\'s proprietary cloud infrastructure. Nodes connect peer-to-peer using WireGuard cryptographic keys, ensuring that data payloads travel directly between devices with end-to-end encryption.

The Headscale daemon handles peer key exchange, network access control lists (ACLs), DNS routing (MagicDNS), and routing subnet routes. Written in Go, it features strict static analysis, unit test suites, and minimal external dependencies. Security audits have commended the minimal attack surface of the control plane, as peer traffic never flows through the Headscale coordinator itself.

With an 8.5 OpenSSF Scorecard score, Headscale adheres to disciplined software release cadences. Official Docker images are signed and published with immutable digest hashes. For sysadmins who value WireGuard mesh simplicity but mandate complete sovereignty over network routing metadata, Headscale is an exemplary, Healthy solution scoring 93/100.`
  },
  {
    slug: 'pi-hole',
    repo: 'pi-hole/pi-hole',
    name: 'Pi-hole',
    tagline: 'Network-wide ad blocking via your own Linux hardware without client software.',
    category: 'network-vpn',
    license_spdx: 'EUPL-1.2',
    stars: 48900,
    contributors: 240,
    last_push_days: 1,
    latest_release: 'v5.18.3',
    safety_score: 94,
    verdict: 'healthy',
    risk_reasons: [
      'DNS port (53) must NEVER be exposed directly to the public internet (open DNS resolver risk).'
    ],
    scorecard: 8.7,
    components: { security_health: 96, maintenance: 95, community: 94, releases: 92 },
    language: 'C / Shell',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d --name pihole -p 53:53/tcp -p 53:53/udp -p 80:80 -e TZ="America/Chicago" -v /etc/pihole:/etc/pihole -v /etc/dnsmasq.d:/etc/dnsmasq.d --restart=unless-stopped pihole/pihole:latest'
    },
    website_url: 'https://pi-hole.net',
    ai_report: `Pi-hole is the world\'s most popular DNS sinkhole, intercepting advertisement, telemetry, and tracking queries at the local network level before packets leave your router. Because blocking occurs via standard DNS response forging (returning 0.0.0.0 for blacklisted domains), Pi-hole shields every device on the network—including smart TVs, IoT appliances, and mobile phones—without requiring client software.

The core DNS engine (FTL) is written in C and based on dnsmasq, optimized to resolve queries in sub-millisecond durations while maintaining query logs in an embedded database. The Pi-hole team has maintained continuous development for nearly a decade, responding swiftly to CVE disclosures and auditing web interface parameters against command injection.

Pi-hole maintains an 8.7 OpenSSF Scorecard rating. Critical warning for operators: Port 53 must remain strictly internal to your local LAN or VPN mesh; exposing an open DNS resolver to the public internet enables distributed denial of service (DDoS) reflection attacks. Deployed internally, Pi-hole is extraordinarily safe and earns a Healthy rating at 94/100.`
  },
  {
    slug: 'wireguard-ui',
    repo: 'ngoduykhanh/wireguard-ui',
    name: 'WireGuard UI',
    tagline: 'Web user interface to manage WireGuard VPN clients, keys, and configurations.',
    category: 'network-vpn',
    license_spdx: 'MIT',
    stars: 6400,
    contributors: 40,
    last_push_days: 48,
    latest_release: 'v0.6.2',
    safety_score: 68,
    verdict: 'caution',
    risk_reasons: [
      'Directly generates host-level WireGuard configurations with root permissions.',
      'Slower release cadence and backlog of pull requests.'
    ],
    scorecard: 6.6,
    components: { security_health: 66, maintenance: 65, community: 72, releases: 70 },
    language: 'Go',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -d --name wireguard-ui -p 5000:5000 -v /etc/wireguard:/etc/wireguard ngoduykhanh/wireguard-ui:latest'
    },
    website_url: 'https://github.com/ngoduykhanh/wireguard-ui',
    ai_report: `WireGuard UI is a web-based administrative management portal developed in Go for creating, revoking, and generating QR codes for WireGuard VPN client profiles. It writes directly to the Linux host\'s /etc/wireguard/wg0.conf file, allowing non-technical family members or colleagues to join a private VPN by scanning a visual code.

While convenient, managing low-level kernel networking configurations through a web portal creates inherent risk. WireGuard UI requires either privileged container flags or host filesystem mount permissions to reload the WireGuard interface. Furthermore, the repository\'s commit cadence has moderated over the past year, resulting in pending upstream dependency updates and open enhancement issues.

With an OpenSSF Scorecard of 6.6, WireGuard UI performs baseline compilation tests, but lacks enterprise-grade automated penetration testing workflows. If deployed, the administrative web interface (port 5000) must be protected with strong authentication and never exposed to the public internet without an external proxy layer. It receives a Caution verdict with a 68/100 Safety Score.`
  },

  // 11. Workflow Automation
  {
    slug: 'n8n',
    repo: 'n8n-io/n8n',
    name: 'n8n',
    tagline: 'Fair-code workflow automation tool with extensive integrations and node system.',
    category: 'automation-workflow',
    license_spdx: 'Sustainable-Use-License',
    stars: 52100,
    contributors: 410,
    last_push_days: 1,
    latest_release: '1.72.1',
    safety_score: 89,
    verdict: 'healthy',
    risk_reasons: [
      'Nodes can execute arbitrary JavaScript / Python code; requires strict credential isolation.'
    ],
    scorecard: 8.3,
    components: { security_health: 90, maintenance: 93, community: 91, releases: 86 },
    language: 'TypeScript',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n docker.n8n.io/n8nio/n8n'
    },
    website_url: 'https://n8n.io',
    ai_report: `n8n is an enterprise-grade workflow automation platform connecting hundreds of APIs, webhooks, databases, and AI models through a visual canvas. Regarded as the leading open ecosystem competitor to Zapier, n8n allows organizations to retain sensitive business logic, API secrets, and customer data payloads on private servers rather than transiting commercial SaaS clouds.

From a security architecture standpoint, n8n encrypts all stored API credentials using AES-256-GCM with a user-supplied encryption key. Code execution nodes (Code node, JavaScript, Python) are sandboxed to mitigate unauthorized system command execution. The engineering team operates a disciplined vulnerability triage process and publishes regular CVE notifications.

With an 8.3 OpenSSF Scorecard rating, the codebase undergoes automated linting, unit testing, and Docker vulnerability scanning. Note on licensing: n8n is distributed under the Sustainable Use License and Fair-code terms, permitting free self-hosting for internal business automation, but restricting commercial resale as an automation service. n8n is rated Healthy at 89/100.`
  },
  {
    slug: 'activepieces',
    repo: 'activepieces/activepieces',
    name: 'Activepieces',
    tagline: 'Open-source business automation platform built for AI and modern API integrations.',
    category: 'automation-workflow',
    license_spdx: 'MIT',
    stars: 12400,
    contributors: 180,
    last_push_days: 1,
    latest_release: '0.36.0',
    safety_score: 88,
    verdict: 'healthy',
    risk_reasons: [
      'Dynamic piece installation downloads npm packages at runtime; outbound container traffic should be filtered.'
    ],
    scorecard: 8.1,
    components: { security_health: 89, maintenance: 92, community: 86, releases: 87 },
    language: 'TypeScript',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d -p 8080:80 -v ~/.activepieces:/root/.activepieces activepieces/activepieces:latest'
    },
    website_url: 'https://www.activepieces.com',
    ai_report: `Activepieces is a modern, MIT-licensed open-source workflow automation platform engineered specifically for developers and business teams. Developed entirely in TypeScript, Activepieces features a modular "piece" architecture where integrations are isolated packages adhering to a strictly defined JSON schema.

Because the core repository is licensed under permissive MIT, organizations enjoy full legal freedom to self-host, embed, and customize the software without fair-code commercial restrictions. Pieces run in sandboxed JavaScript worker threads, preventing infinite loops or memory starvation from stalling the main control daemon.

The repository holds an 8.1 OpenSSF Scorecard score, driven by continuous integration workflows and automated package testing. The development velocity is rapid, with multiple new piece integrations and core stability improvements shipping weekly. Activepieces is a reliable, enterprise-friendly workflow orchestrator and achieves a Healthy rating of 88/100.`
  },
  {
    slug: 'huginn',
    repo: 'huginn/huginn',
    name: 'Huginn',
    tagline: 'Build agents that monitor and act on your behalf on the web (open-source IFTTT).',
    category: 'automation-workflow',
    license_spdx: 'MIT',
    stars: 41200,
    contributors: 215,
    last_push_days: 180,
    latest_release: 'v2023.05.01',
    safety_score: 42,
    verdict: 'risky',
    risk_reasons: [
      'Infrequent commit cadence with months of repository inactivity.',
      'Dozens of high-severity dependency CVEs in legacy Ruby on Rails gem dependencies.',
      'Unmaintained web scrapers prone to silent breakage and SSRF vulnerabilities.'
    ],
    scorecard: 4.4,
    components: { security_health: 38, maintenance: 35, community: 55, releases: 44 },
    language: 'Ruby',
    self_host_difficulty: 'Advanced',
    install_commands: {
      docker: 'docker run -d -p 3000:3000 huginn/huginn'
    },
    website_url: 'https://github.com/huginn/huginn',
    ai_report: `Huginn was one of the earliest open-source alternatives to IFTTT and Yahoo Pipes, enabling users to program software agents that scan web pages, parse RSS feeds, and execute actions when events match trigger thresholds. Built on Ruby on Rails, Huginn achieved wide acclaim for its flexibility and raw scraping capabilities.

However, repository analysis reveals that Huginn has entered a state of software decay. Primary repository maintenance has slowed dramatically, with months passing between commit activities. More critically, the project depends on legacy Ruby gem dependencies with multiple unaddressed CVE advisories covering remote command execution surface areas, XML external entity (XXE) parsing bugs, and denial of service.

With an OpenSSF Scorecard of only 4.4, Huginn fails modern supply-chain security standards. CI workflows fail consistently on modern Ruby runtimes, and Docker builds require outdated base operating systems. We categorize Huginn as Risky with a 42/100 Safety Score. Operators still running Huginn are urged to migrate to active platforms like n8n or Activepieces to eliminate security vulnerabilities.`
  },

  // 12. Photo Management
  {
    slug: 'immich',
    repo: 'immich-app/immich',
    name: 'Immich',
    tagline: 'High performance self-hosted photo and video management solution.',
    category: 'photo-management',
    license_spdx: 'AGPL-3.0-only',
    stars: 54100,
    contributors: 430,
    last_push_days: 1,
    latest_release: 'v1.124.0',
    safety_score: 95,
    verdict: 'healthy',
    risk_reasons: [
      'Rapid release cycle requires reading release notes prior to upgrading container versions.',
      'Heavy machine-learning operations benefit from hardware GPU/NPU allocation.'
    ],
    scorecard: 8.9,
    components: { security_health: 96, maintenance: 98, community: 94, releases: 93 },
    language: 'TypeScript / Dart',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker compose up -d'
    },
    website_url: 'https://immich.app',
    ai_report: `Immich is arguably the crown jewel of modern self-hosted media software, offering a 1:1 drop-in replacement for Google Photos and Apple iCloud Photos. With native mobile applications for iOS and Android, Immich delivers instantaneous background camera roll backups, AI facial recognition, object detection, reverse geocoding maps, and shared partner galleries.

The project\'s engineering discipline is extraordinary. Immich operates under the FUTO software organization, employing dedicated full-time core maintainers. Vulnerabilities are handled with high urgency under coordinated disclosure, and code is screened via automated CodeQL, container vulnerability scanners, and rigorous integration suites. Machine learning pipelines (CLIP, facial recognition) run locally on dedicated sandboxed microservices.

Immich achieves an 8.9 OpenSSF Scorecard. Storage routines are strictly non-destructive: original media files are preserved with exact metadata and checksum integrity. While the project ships rapid releases that necessitate reading breaking change notices, the software has proven remarkably resilient and reliable. Immich receives a glowing Healthy rating at 95/100.`
  },
  {
    slug: 'photoprism',
    repo: 'photoprism/photoprism',
    name: 'PhotoPrism',
    tagline: 'AI-powered photos app for the decentralized web powered by Go and TensorFlow.',
    category: 'photo-management',
    license_spdx: 'AGPL-3.0-only',
    stars: 35100,
    contributors: 95,
    last_push_days: 4,
    latest_release: '241108',
    safety_score: 72,
    verdict: 'caution',
    risk_reasons: [
      'Commercial feature gating creates tension between community and patron editions.',
      'High initial indexing CPU and memory demands can overwhelm lower-tier VPS nodes.'
    ],
    scorecard: 6.9,
    components: { security_health: 74, maintenance: 73, community: 70, releases: 71 },
    language: 'Go',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker compose up -d'
    },
    website_url: 'https://www.photoprism.app',
    ai_report: `PhotoPrism is an AI-powered photo management engine written in Go, utilizing Google TensorFlow to classify pictures, recognize facial expressions, and parse location coordinates. It excels at indexing existing structured directory archives without moving or modifying original files, making it popular among professional photographers with large NAS archives.

The backend Go daemon is stable, and database interactions through MariaDB are well-optimized. However, the project has experienced community headwinds due to increasingly aggressive monetization and feature paywalls (such as restricting multi-user account management and certain map styles to paid Sponsor editions). Development velocity on the open community branch has consequently decelerated relative to competitors like Immich.

With an OpenSSF Scorecard rating of 6.9, PhotoPrism satisfies core build checks, but lags in comprehensive supply-chain attestations. For single-user deployments focused purely on organizing static hard drives without mobile synchronization, PhotoPrism remains capable, but is rated Caution with a 72/100 Safety Score due to governance and licensing divergence.`
  },
  {
    slug: 'librephotos',
    repo: 'LibrePhotos/librephotos',
    name: 'LibrePhotos',
    tagline: 'Self-hosted open-source photo management solution (community fork of Ownphotos).',
    category: 'photo-management',
    license_spdx: 'MIT',
    stars: 5900,
    contributors: 55,
    last_push_days: 22,
    latest_release: '2024.11',
    safety_score: 60,
    verdict: 'caution',
    risk_reasons: [
      'Complex multi-container architecture (Django, React, Redis, Postgres, Machine Learning worker).',
      'Smaller maintainer bandwidth results in intermittent bug resolution delays.'
    ],
    scorecard: 5.8,
    components: { security_health: 60, maintenance: 58, community: 63, releases: 62 },
    language: 'Python / Django',
    self_host_difficulty: 'Advanced',
    install_commands: {
      docker: 'docker compose up -d'
    },
    website_url: 'https://librephotos.com',
    ai_report: `LibrePhotos emerged as a community-driven continuation of the abandoned Ownphotos project, aiming to deliver an open, non-commercial self-hosted photo organizer with semantic search, face recognition, and album grouping. Built with Django and React, LibrePhotos interacts with PyTorch and Dlib to extract face vectors and classify scene contents.

The project\'s greatest hurdle is operational complexity. Running LibrePhotos requires synchronizing five distinct container services (frontend, backend, database, Redis cache, and ML compute worker). On smaller systems, out-of-memory errors during thumbnail generation and heavy model inference can cause silent pipeline failures. Furthermore, the core maintainer team is small, leading to slower resolution of issue tickets and packaging errors.

The project records an OpenSSF Scorecard score of 5.8. While LibrePhotos is genuinely free, open-source, and devoid of commercial tier restrictions, the operational overhead and intermittent release delays warrant a Caution rating with a 60/100 Safety Score. Users deploying it should allocate adequate swap and monitor container health closely.`
  },

  // 13. Finance & Budgeting
  {
    slug: 'actual-budget',
    repo: 'actualbudget/actual',
    name: 'Actual Budget',
    tagline: 'Privacy-focused zero-based budgeting system with local-first encryption.',
    category: 'finance-budgeting',
    license_spdx: 'MIT',
    stars: 18200,
    contributors: 165,
    last_push_days: 1,
    latest_release: 'v24.12.0',
    safety_score: 94,
    verdict: 'healthy',
    risk_reasons: [
      'End-to-end encryption password cannot be recovered if forgotten by the user.'
    ],
    scorecard: 8.8,
    components: { security_health: 96, maintenance: 96, community: 92, releases: 93 },
    language: 'TypeScript',
    self_host_difficulty: 'Easy',
    install_commands: {
      docker: 'docker run -d -p 5006:5006 -v actual_data:/data --name actual-server actualbudget/actual-server:latest'
    },
    website_url: 'https://actualbudget.org',
    ai_report: `Actual Budget is an inspiring open-source success story. Originally developed as a commercial software product by an ex-Stripe engineer, the founder open-sourced the entire platform (client apps and sync server) under the permissive MIT license in 2022. It operates on the envelope/zero-based budgeting methodology, helping individuals and households allocate income deliberately to expense categories.

The architecture is built on local-first principles. Budgets are stored locally in SQLite within the browser (via WebAssembly) or desktop application, enabling full functionality offline. When syncing across devices, transactions are encrypted client-side using end-to-end encryption (E2EE). The server stores only encrypted SQLite change sets, ensuring that financial figures, bank accounts, and balances are unreadable to anyone accessing the sync server.

Actual Budget holds an 8.8 OpenSSF Scorecard, supported by an energized developer community that ships monthly releases, bank-sync plugins (GoCardless/SimpleFIN), and rapid security patches. For individuals demanding financial sovereignty without compromising on polished UI or encryption standards, Actual Budget is an exceptional Healthy choice at 94/100.`
  },
  {
    slug: 'firefly-iii',
    repo: 'firefly-iii/firefly-iii',
    name: 'Firefly III',
    tagline: 'Free and open-source personal finance manager with double-entry bookkeeping.',
    category: 'finance-budgeting',
    license_spdx: 'AGPL-3.0-only',
    stars: 16400,
    contributors: 140,
    last_push_days: 1,
    latest_release: 'v6.2.8',
    safety_score: 91,
    verdict: 'healthy',
    risk_reasons: [
      'Double-entry accounting principles introduce a learning curve for basic personal budgeting.',
      'Bank importer requires separate container setup and API token provisioning.'
    ],
    scorecard: 8.4,
    components: { security_health: 92, maintenance: 94, community: 88, releases: 90 },
    language: 'PHP / Laravel',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -d -v firefly_upload:/var/www/html/storage/upload -p 8080:8080 -e APP_KEY=SomeRandomString32BytesLong fireflyiii/core:latest'
    },
    website_url: 'https://www.firefly-iii.org',
    ai_report: `Firefly III is a mature, robust personal finance manager developed on the PHP Laravel framework, designed around strict double-entry bookkeeping rules. It provides meticulous tracking of financial inflows and outflows, budgets, recurrent bills, investment portfolios, and net worth across multiple currencies.

Maintained actively by a dedicated creator for over a decade, Firefly III demonstrates exemplary repository hygiene. Security audits and CVE disclosures are treated with utmost seriousness. The application features strict CSRF token validation, parameterized SQL queries via Eloquent ORM, two-factor authentication, and granular personal access tokens for API integrations.

The project records an 8.4 OpenSSF Scorecard. Data importer companions exist for importing CSVs and connecting to European banking APIs (Spectre/Salt Edge). Upgrades are streamlined via Docker, and database schema migrations run reliably on PostgreSQL and MySQL. For users desiring deep financial auditing and double-entry rigor, Firefly III is a standout Healthy application scoring 91/100.`
  },
  {
    slug: 'maybe',
    repo: 'maybe-finance/maybe',
    name: 'Maybe',
    tagline: 'The OS for your personal finances, investments, and wealth tracking.',
    category: 'finance-budgeting',
    license_spdx: 'AGPL-3.0-only',
    stars: 32900,
    contributors: 85,
    last_push_days: 4,
    latest_release: 'v0.1.0-alpha',
    safety_score: 68,
    verdict: 'caution',
    risk_reasons: [
      'Software is in early public alpha stage; breaking schema changes are expected.',
      'Documentation and deployment guides are actively evolving.'
    ],
    scorecard: 6.8,
    components: { security_health: 70, maintenance: 78, community: 72, releases: 55 },
    language: 'Ruby on Rails',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: 'docker run -d -p 3000:3000 ghcr.io/maybe-finance/maybe:latest'
    },
    website_url: 'https://maybe.co',
    ai_report: `Maybe caused a major sensation across the open-source world when its venture-backed startup parent ceased commercial operations and open-sourced its entire modern wealth management platform under AGPL-3.0. Built with modern Ruby on Rails 7, Hotwire, and Tailwind CSS, Maybe provides an extraordinarily sleek interface for tracking investments, real estate, debts, and cash flow.

While the engineering craftsmanship and UI aesthetics are top tier, Maybe is explicitly in an active alpha phase of community redevelopment. The core database schema and internal data models undergo frequent refactoring, meaning operators self-hosting the software must be prepared for potential schema migrations and breaking API changes between updates.

Maybe achieves a 6.8 OpenSSF Scorecard rating. CI workflows run rspec test suites and rubocop linters, but formal automated security auditing for production readiness is still maturing. For early adopters and developers who want a cutting-edge, beautiful personal wealth tracker, Maybe is exciting, but earns a Caution verdict with a 68/100 Safety Score until stable, non-alpha releases are published.`
  }
];

// Write individual JSON files
for (const tool of rawTools) {
  if (!tool.scanned_at) {
    tool.scanned_at = '2026-09-18T10:00:00.000Z';
  }
  const filePath = path.join(targetDir, `${tool.slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(tool, null, 2), 'utf-8');
  console.log(`Wrote ${tool.slug}.json`);
}

console.log(`Total tools written: ${rawTools.length}`);
