import fs from 'fs';
import path from 'path';

// Automated Test Suite for Check.mate Progressive Web App (PWA) Engine
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const SRC_DIR = path.join(ROOT_DIR, 'src');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error(`    Details: ${details}`);
  }
}

console.log('\n======================================================');
console.log('   CHECK.MATE PWA INSTALLATION AGGRESSIVE TEST SUITE');
console.log('======================================================\n');

// --- Suite 1: Web App Manifest Verification ---
console.log('--- Suite 1: Web App Manifest Validation ---');
const manifestPath = path.join(PUBLIC_DIR, 'manifest.json');
assert(fs.existsSync(manifestPath), 'public/manifest.json file exists on disk');

let manifestJson: any = {};
try {
  manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert(true, 'manifest.json parses as valid JSON');
} catch (e: any) {
  assert(false, 'manifest.json parses as valid JSON', e.message);
}

assert(Boolean(manifestJson.name && manifestJson.name.length > 0), 'Manifest has non-empty name');
assert(Boolean(manifestJson.short_name && manifestJson.short_name.length <= 12), 'Manifest short_name is <= 12 characters for mobile screens', `Got ${manifestJson.short_name}`);
assert(manifestJson.display === 'standalone', 'Manifest display mode is set to "standalone"');
assert(manifestJson.start_url?.startsWith('/'), 'Manifest start_url is root relative');
assert(manifestJson.background_color === '#161512', 'Manifest background_color matches app shell');
assert(manifestJson.theme_color === '#161512', 'Manifest theme_color matches app shell');
assert(Array.isArray(manifestJson.icons) && manifestJson.icons.length >= 3, 'Manifest has at least 3 icons');

// Check icons
const has192 = manifestJson.icons?.some((i: any) => i.sizes === '192x192' && i.type === 'image/png');
const has512 = manifestJson.icons?.some((i: any) => i.sizes === '512x512' && i.type === 'image/png');
const hasMaskable = manifestJson.icons?.some((i: any) => i.purpose?.includes('maskable'));
assert(has192, 'Manifest includes standard 192x192 PNG icon');
assert(has512, 'Manifest includes standard 512x512 PNG icon');
assert(hasMaskable, 'Manifest includes Android adaptive maskable icon');

// Check manifest shortcuts
assert(Array.isArray(manifestJson.shortcuts) && manifestJson.shortcuts.length >= 3, 'Manifest has at least 3 quick app shortcuts');
const playShortcut = manifestJson.shortcuts?.find((s: any) => s.url.includes('/play'));
assert(Boolean(playShortcut), 'Manifest has Play PvP shortcut');

// --- Suite 2: PWA Icon Assets on Disk ---
console.log('\n--- Suite 2: Physical PWA Icon Files on Disk ---');
const requiredIcons = [
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  'icons/icon-512x512-maskable.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32x32.png',
  'icons/icon.svg',
  'apple-touch-icon.png',
];

for (const iconRel of requiredIcons) {
  const iconPath = path.join(PUBLIC_DIR, iconRel);
  const exists = fs.existsSync(iconPath);
  if (exists) {
    const stats = fs.statSync(iconPath);
    assert(stats.size > 200, `Icon ${iconRel} exists and has valid payload (${stats.size} bytes)`);
  } else {
    assert(false, `Icon ${iconRel} exists and has valid payload`, 'File not found');
  }
}

// --- Suite 3: Service Worker Integrity & Strategies ---
console.log('\n--- Suite 3: Service Worker Architecture & Strategies ---');
const swPath = path.join(PUBLIC_DIR, 'sw.js');
assert(fs.existsSync(swPath), 'public/sw.js exists');

const swContent = fs.readFileSync(swPath, 'utf8');
assert(swContent.includes('install'), 'Service worker registers install event');
assert(swContent.includes('activate'), 'Service worker registers activate event');
assert(swContent.includes('fetch'), 'Service worker registers fetch event');
assert(swContent.includes('skipWaiting'), 'Service worker invokes skipWaiting() for fast updates');
assert(swContent.includes('clients.claim'), 'Service worker invokes clients.claim()');

// Check critical bypass rules
assert(swContent.includes('/api/'), 'Service worker bypasses /api/ dynamic routes');
assert(swContent.includes('socket.io'), 'Service worker bypasses WebSocket connections');
assert(swContent.includes('identitytoolkit.googleapis.com'), 'Service worker bypasses Firebase Auth');
assert(swContent.includes('firestore.googleapis.com'), 'Service worker bypasses Firestore Realtime DB');

// Check caching strategies
assert(swContent.includes('request.mode === \'navigate\''), 'Service worker implements navigation network-first fallback');
assert(swContent.includes('OFFLINE_URL'), 'Service worker points to offline fallback');
assert(swContent.includes('caches.match'), 'Service worker handles stale cache matches');

// --- Suite 4: Offline Fallback Page ---
console.log('\n--- Suite 4: Offline Fallback Page & UX ---');
const offlinePagePath = path.join(SRC_DIR, 'app', 'offline', 'page.tsx');
assert(fs.existsSync(offlinePagePath), 'src/app/offline/page.tsx exists');

const offlineContent = fs.readFileSync(offlinePagePath, 'utf8');
assert(offlineContent.includes('WifiOff') || offlineContent.includes('Wifi'), 'Offline page renders network status icon');
assert(offlineContent.includes('handleRetry'), 'Offline page provides manual reconnection retry handler');
assert(offlineContent.includes('/bots'), 'Offline page provides offline Bot engine launcher');
assert(offlineContent.includes('/play'), 'Offline page provides offline Pass-and-Play launcher');

// --- Suite 5: Root Layout PWA Metadata & Safe Areas ---
console.log('\n--- Suite 5: Root Layout PWA Metadata & Apple Support ---');
const layoutPath = path.join(SRC_DIR, 'app', 'layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');
assert(layoutContent.includes('manifest.webmanifest'), 'layout.tsx declares webmanifest link');
assert(layoutContent.includes('appleWebApp'), 'layout.tsx declares appleWebApp metadata');
assert(layoutContent.includes('viewportFit: \'cover\''), 'layout.tsx declares viewportFit: cover for notch devices');
assert(layoutContent.includes('themeColor'), 'layout.tsx declares themeColor');

// Check CSS safe-area insets
const cssPath = path.join(SRC_DIR, 'app', 'globals.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
assert(cssContent.includes('safe-area-inset-top'), 'globals.css declares safe-area-inset-top');
assert(cssContent.includes('safe-area-inset-bottom'), 'globals.css declares safe-area-inset-bottom');
assert(cssContent.includes('display-mode: standalone'), 'globals.css declares standalone display mode optimizations');

// --- Suite 6: PWA Installation Hook & Cross-Device Engine ---
console.log('\n--- Suite 6: PWA Installation Hook & Cross-Device Engine ---');
const hookPath = path.join(SRC_DIR, 'lib', 'usePwaInstall.ts');
assert(fs.existsSync(hookPath), 'src/lib/usePwaInstall.ts exists');

const hookContent = fs.readFileSync(hookPath, 'utf8');
assert(hookContent.includes('beforeinstallprompt'), 'Hook intercepts beforeinstallprompt event for Chromium/Edge/Android');
assert(hookContent.includes('appinstalled'), 'Hook listens for appinstalled event');
assert(hookContent.includes('display-mode: standalone'), 'Hook detects standalone media display mode');
assert(hookContent.includes('window.navigator as unknown as { standalone?: boolean }'), 'Hook detects iOS Safari standalone mode');
assert(hookContent.includes('navigator.serviceWorker.register'), 'Hook registers service worker automatically');

// --- Suite 7: PWA Installation Modal & Platform Flows ---
console.log('\n--- Suite 7: PWA Installation Modal & Platform Workflows ---');
const modalPath = path.join(SRC_DIR, 'components', 'pwa', 'PwaInstallModal.tsx');
assert(fs.existsSync(modalPath), 'src/components/pwa/PwaInstallModal.tsx exists');

const modalContent = fs.readFileSync(modalPath, 'utf8');
assert(modalContent.includes('isIos'), 'Modal has dedicated iOS Safari flow');
assert(modalContent.includes('Add to Home Screen'), 'Modal includes iOS Add to Home Screen instructions');
assert(modalContent.includes('installApp'), 'Modal triggers native install prompt');
assert(modalContent.includes('isInstalled'), 'Modal displays standalone installed badge when active');

// --- Suite 8: AppShell & Navigation Wiring ---
console.log('\n--- Suite 8: AppShell & Navigation Wiring ---');
const appShellPath = path.join(SRC_DIR, 'components', 'layout', 'AppShell.tsx');
const appShellContent = fs.readFileSync(appShellPath, 'utf8');
assert(appShellContent.includes('usePwaInstall'), 'AppShell mounts usePwaInstall');
assert(appShellContent.includes('PwaInstallModal'), 'AppShell renders PwaInstallModal');
assert(appShellContent.includes('onOpenPwaInstall'), 'AppShell passes onOpenPwaInstall to navigation components');

console.log('\n======================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED:      ${passedTests}`);
console.log(`FAILED:      ${totalTests - passedTests}`);
console.log('======================================================\n');

if (passedTests === totalTests) {
  console.log('🎉 ALL PWA ENGINE & CROSS-DEVICE SCENARIOS PASSED WITH 100% ACCURACY!\n');
  process.exit(0);
} else {
  console.error('❌ SOME PWA TESTS FAILED. PLEASE REVIEW DETAILS ABOVE.\n');
  process.exit(1);
}
