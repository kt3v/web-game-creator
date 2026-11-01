import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
import { build } from 'vite';

const output = resolve('test-results'); await mkdir(output, { recursive: true });
const dist = resolve('dist');
const fixture = await build({ configFile: false, logLevel: 'silent', build: {
  write: false, lib: { entry: resolve('tests/engine-fixture.ts'), formats: ['es'] },
} });
const engineCode = (Array.isArray(fixture) ? fixture[0] : fixture).output.find(chunk => chunk.type === 'chunk').code;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.wav': 'audio/wav' };
// A nested deployment catches absolute-path asset regressions.
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/engine-test.html') { res.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><html><body></body></html>'); return; }
    if (url.pathname === '/engine-test.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }).end(engineCode); return; }
    if (!url.pathname.startsWith('/games/starter/')) { res.writeHead(404).end(); return; }
    const path = resolve(dist, decodeURIComponent(url.pathname.slice('/games/starter/'.length)) || 'index.html');
    if (!path.startsWith(dist + sep)) { res.writeHead(403).end(); return; }
    const body = await readFile(path); res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const url = `http://127.0.0.1:${server.address().port}/games/starter/`;
const browser = await chromium.launch({ headless: true });
const errors = [], networkFailures = [];
const sdkCode = `
  window.__events = [];
  window.PokiSDK = {
    init: () => Promise.resolve(),
    gameLoadingFinished: () => __events.push('loaded'),
    gameplayStart: () => __events.push('start'),
    gameplayStop: () => __events.push('stop'),
    measure: (c, w, a) => __events.push(c + ':' + w + ':' + a),
    commercialBreak: () => { __events.push('ad'); return new Promise((yes, no) => { window.__finishAd = yes; window.__rejectAd = no; }); },
    rewardedBreak: () => Promise.resolve(false),
  };
  const original = window.AudioContext;
  window.__audioContexts = [];
  if (original) window.AudioContext = class extends original { constructor(...args) { super(...args); window.__audioContexts.push(this); } };
`;
async function pageFor(size, options = {}) {
  const context = await browser.newContext({ viewport: size, ...options });
  await context.route('https://game-cdn.poki.com/**', route => route.fulfill({ contentType: 'application/javascript', body: sdkCode }));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) networkFailures.push(response.url()); });
  await page.goto(url); await page.locator('.boot').waitFor({ state: 'detached' });
  return { context, page };
}
async function shot(page, name) { await page.screenshot({ path: resolve(output, `${name}.png`) }); }
async function checkLayout(page) {
  const outside = await page.locator('button:visible, input:visible, select:visible, h1:visible').evaluateAll(elements => elements.filter(el => {
    const r = el.getBoundingClientRect();
    // Scrollable settings rows are allowed outside their scrollport, never outside the screen on X.
    return r.left < -1 || r.right > innerWidth + 1 || (!el.closest('[data-scroll]') && (r.top < -1 || r.bottom > innerHeight + 1));
  }).map(el => el.outerHTML));
  assert.deepEqual(outside, []);
}
try {
  const enginePage = await browser.newPage();
  enginePage.on('pageerror', error => errors.push(error.message));
  await enginePage.goto(new URL('/engine-test.html', url).href);
  const engine = await enginePage.evaluate(async () => {
    const { probeEngine } = await import('/engine-test.js'); return await probeEngine();
  });
  assert.deepEqual(engine, { menuUpdates: 0, playingUpdates: 1, pausedUpdates: 1,
    cameras: 1, webgl: true, initialSize: [320, 180], lowSize: [240, 135], destroyed: true, released: true });
  await enginePage.close();
  const { context, page } = await pageFor({ width: 1280, height: 720 });
  assert.deepEqual(await page.evaluate(() => __events), ['loaded']);
  await checkLayout(page); await shot(page, 'desktop-menu');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await checkLayout(page); await shot(page, 'desktop-settings');
  await page.locator('[data-setting="music"]').fill('17');
  await page.locator('[data-setting="uiMode"]').selectOption('touch');
  assert.equal(await page.locator('#app').getAttribute('data-ui'), 'touch');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  assert.equal(await page.locator('#app').getAttribute('data-screen'), 'playing');
  await shot(page, 'desktop-playing');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await shot(page, 'desktop-paused');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  assert.equal(await page.locator('#app').getAttribute('aria-busy'), 'true');
  assert.equal(await page.locator('#app').evaluate(el => el.inert), true);
  assert.equal(await page.evaluate(() => __audioContexts[0].state), 'suspended');
  const beforeAd = await page.evaluate(() => __events.length);
  await page.keyboard.press('Escape'); await page.keyboard.press('ArrowUp');
  await page.locator('canvas').dispatchEvent('pointerdown', { clientX: 640, clientY: 346 });
  assert.equal(await page.evaluate(() => __events.length), beforeAd);
  await page.evaluate(() => __finishAd());
  await page.waitForFunction(() => document.querySelector('#app').dataset.screen === 'playing');
  await page.waitForFunction(() => __audioContexts[0].state === 'running');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Main menu', exact: true }).click();
  const events = await page.evaluate(() => __events.filter(e => ['loaded', 'start', 'stop', 'ad'].includes(e)));
  assert.deepEqual(events, ['loaded', 'start', 'stop', 'ad', 'start', 'stop']);
  await page.reload(); await page.locator('.boot').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  assert.equal(await page.locator('[data-setting="music"]').inputValue(), '17');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.waitForFunction(() => !!window.__rejectAd);
  await page.evaluate(() => __rejectAd(new Error('blocked')));
  await page.waitForFunction(() => document.querySelector('#app').dataset.screen === 'playing');
  await context.close();

  for (const [name, size, isMobile] of [
    ['mobile-portrait', { width: 390, height: 844 }, true],
    ['mobile-landscape', { width: 844, height: 390 }, true],
    ['iframe-small', { width: 640, height: 360 }, false],
    ['iframe-medium', { width: 836, height: 470 }, false],
    ['iframe-large', { width: 1031, height: 580 }, false],
    ['tablet', { width: 1024, height: 768 }, true],
  ]) {
    const { context, page } = await pageFor(size, { isMobile, hasTouch: isMobile });
    assert.equal(await page.locator('#app').getAttribute('data-ui'), isMobile ? 'touch' : 'desktop');
    await checkLayout(page); await shot(page, `${name}-menu`);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await checkLayout(page); await shot(page, `${name}-settings`);
    await page.getByRole('button', { name: 'Close settings' }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await checkLayout(page); await shot(page, `${name}-playing`);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await checkLayout(page); await shot(page, `${name}-paused`);
    // Layout-only fixture for the results placeholder; Session.finish is covered by unit tests.
    await page.evaluate(() => {
      const panel = document.querySelector('[data-screen="results"]').cloneNode(true);
      document.body.replaceChildren(panel);
      panel.hidden = false;
    });
    await checkLayout(page); await shot(page, `${name}-results`);
    await context.close();
  }
  const blocked = await browser.newContext({ viewport: { width: 640, height: 360 } });
  await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }); });
  await blocked.route('https://game-cdn.poki.com/**', route => route.abort());
  const fallback = await blocked.newPage(); await fallback.goto(url); await fallback.locator('.boot').waitFor({ state: 'detached' });
  await fallback.getByRole('button', { name: 'Play', exact: true }).click();
  assert.equal(await fallback.locator('#app').getAttribute('data-screen'), 'playing');
  await blocked.close();
  assert.deepEqual(errors, []); assert.deepEqual(networkFailures, []);
  console.log('Browser checks passed: PlayCanvas rendering, pause/update gate, single loop, resize/disposal, shell, lifecycle, ad locks and responsive layouts.');
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
