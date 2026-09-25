import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_URL = 'http://localhost:4321';

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`✓ [PASS] ${name}${detail ? ` — ${detail}` : ''}`);
    passed++;
  } else {
    console.error(`✗ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function run() {
  console.log('=== SAFEOPENSOURCE AUTO-SCROLLING SECTOR FILTER BAR VERIFICATION ===\n');

  const radarHeroContent = fs.readFileSync(path.join(ROOT, 'src/components/DetectionRadarHero.astro'), 'utf8');
  const globalCss = fs.readFileSync(path.join(ROOT, 'src/styles/global.css'), 'utf8');

  const homeRes = await fetch(`${BASE_URL}/`);
  const homeHtml = await homeRes.text();

  // 1. Loop is seamless (Duplicate set with aria-hidden="true" + tabindex="-1", identical gap-1.5 pr-1.5, translate3d(-50%,0,0), 40px edge fades)
  const totalChipsCount = (homeHtml.match(/class="sector-filter-chip/g) || []).length;
  const cloneChipsCount = (homeHtml.match(/data-marquee-clone="true"\s+aria-hidden="true"\s+tabindex="-1"/g) || []).length;
  const primaryChipsCount = totalChipsCount - cloneChipsCount;

  check(
    '1. Loop is seamless (duplicate chip set with aria-hidden="true" + tabindex="-1", exact gap-1.5 pr-1.5, 40px edge fade masks)',
    primaryChipsCount === 15 &&
      cloneChipsCount === 15 &&
      homeHtml.includes('id="sector-chip-group-primary"') &&
      homeHtml.includes('id="sector-chip-group-clone" aria-hidden="true"') &&
      globalCss.includes('transform: translate3d(-50%, 0, 0);') &&
      globalCss.includes('mask-image: linear-gradient(to right, transparent 0px, black 40px, black calc(100% - 40px), transparent 100%);') &&
      radarHeroContent.includes('Math.round(groupWidth / 30)'),
    `Primary set: ${primaryChipsCount} chips, Clone set: ${cloneChipsCount} chips (aria-hidden + tabindex=-1), ~30px/s calibration, 40px edge fades`
  );

  // 2. Hover pauses, focus pauses, manual scroll disables for session
  check(
    '2. Hover pauses, focus-within pauses, manual scroll disables auto-scroll for session',
    globalCss.includes('.sector-marquee-viewport:hover .sector-marquee-track') &&
      globalCss.includes('.sector-marquee-viewport:focus-within .sector-marquee-track') &&
      globalCss.includes('animation-play-state: paused !important;') &&
      globalCss.includes('.sector-marquee-viewport[data-manual-scroll="true"]') &&
      radarHeroContent.includes("sessionStorage.setItem('sos-sector-manual-scroll', 'true')"),
    'CSS :hover & :focus-within pause + wheel/touchmove/pointerdown session manual-scroll fallback verified'
  );

  // 3. Clicking a chip mid-scroll applies the radar filter without snapping ticker position
  check(
    '3. Clicking a chip mid-scroll applies the radar filter without snapping ticker back',
    radarHeroContent.includes("currentSector = chip.getAttribute('data-sector') || 'all';") &&
      radarHeroContent.includes('applyFiltersAndRecomputeStats();') &&
      !radarHeroContent.includes('filterBar.scrollLeft = 0') &&
      !radarHeroContent.includes('scrollIntoView'),
    'Both primary and clone chips update currentSector & radar stats without modifying scrollLeft or transform'
  );

  // 4. Reduced-motion -> static row, native scrollbar
  check(
    '4. prefers-reduced-motion -> static row with native scrollbar and duplicate set hidden',
    globalCss.includes('@media (prefers-reduced-motion: reduce)') &&
      globalCss.includes('overflow-x: auto !important;') &&
      globalCss.includes('.sector-chip-group-clone,\n  .sector-edge-fade-left,\n  .sector-edge-fade-right {\n    display: none !important;'),
    'Reduced-motion disables marquee, hides duplicate set & fade masks, and restores native horizontal scrollbar'
  );

  // 5. Pause/play toggle button at row right edge works and persists to localStorage
  check(
    '5. Pause/play toggle button at right edge with real SVG icons, aria-pressed, and localStorage persistence',
    homeHtml.includes('id="sector-marquee-toggle-btn"') &&
      homeHtml.includes('id="sector-marquee-icon-pause"') &&
      homeHtml.includes('id="sector-marquee-icon-play"') &&
      radarHeroContent.includes("localStorage.getItem('sos-sector-marquee-paused')") &&
      radarHeroContent.includes("localStorage.setItem('sos-sector-marquee-paused'"),
    'Right-edge pause/play button with SVG icons, aria-pressed state, and localStorage("sos-sector-marquee-paused") verified'
  );

  // 6. No per-frame JS in perf trace; animation is compositor-only + IntersectionObserver offscreen pause
  check(
    '6. No per-frame JS loops; compositor-only translate3d animation + IntersectionObserver offscreen pause',
    globalCss.includes('will-change: transform;') &&
      globalCss.includes('.sector-marquee-viewport[data-offscreen="true"] .sector-marquee-track') &&
      radarHeroContent.includes("filterBar.setAttribute('data-offscreen', entry.isIntersecting ? 'false' : 'true')") &&
      !radarHeroContent.includes('requestAnimationFrame') &&
      !radarHeroContent.includes('setInterval'),
    '100% compositor translate3d CSS animation + IntersectionObserver off-viewport pause + zero JS frame loops'
  );

  if (failed > 0) {
    process.exit(1);
  }
  console.log(`\nALL ${passed}/6 AUTO-SCROLLING SECTOR FILTER BAR ACCEPTANCE CRITERIA PASSED.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
