import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const dist = resolve('dist'), output = resolve('test-results/yoola');
await mkdir(output, { recursive: true });
const html = await readFile(resolve(dist, 'index.html'), 'utf8');
assert.ok(html.indexOf('https://www.youtube.com/game_api/v1') < html.indexOf('type="module"'));
assert.equal((html.match(/game_api\/v1/g) ?? []).length, 1);
for (const file of await readdir(resolve(dist, 'assets'))) {
  if (!file.endsWith('.js')) continue;
  const source = await readFile(resolve(dist, 'assets', file), 'utf8');
  assert.doesNotMatch(source, /PokiSDK|game-cdn\.poki|__events|__finishAd/);
}
const server = createServer(async (req, res) => {
  try {
    const path = resolve(dist, decodeURIComponent(new URL(req.url, 'http://localhost').pathname.replace(/^\/games\/starter\//, '')) || 'index.html');
    if (!path.startsWith(dist + sep)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[extname(path)] ?? 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes); });
const url = `http://127.0.0.1:${server.address().port}/games/starter/`;
const browser = await chromium.launch({ headless: true });
const errors = [], external = [];
const sdk = `
  window.__events = [];
  window.__saved = null;
  window.__audioContexts = [];
  window.__frames = 0;
  window.__renders = 0;
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = fn => raf.call(window, time => { __frames++; fn(time); });
  const clear = WebGL2RenderingContext.prototype.clear;
  WebGL2RenderingContext.prototype.clear = function(...args) { __renders++; return clear.apply(this, args); };
  const Audio = window.AudioContext;
  window.AudioContext = class extends Audio { constructor(...args) { super(...args); __audioContexts.push(this); } };
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('cloud build must not access localStorage'); } });
  window.ytgame = {
    IN_PLAYABLES_ENV: true,
    game: {
      firstFrameReady: () => __events.push('frame'),
      gameReady: () => { if (document.querySelector('.boot')) throw new Error('ready before interactive'); __events.push('ready'); },
      loadData: () => { __events.push('load'); return new Promise((yes, no) => { window.__load = yes; window.__failLoad = no; }); },
      saveData: async data => { __events.push('save'); window.__saved = data; },
    },
    system: {
      isAudioEnabled: () => false,
      onAudioEnabledChange: fn => { window.__audio = fn; return () => {}; },
      onPause: fn => { window.__pause = fn; return () => {}; },
      onResume: fn => { window.__resume = fn; return () => {}; },
    },
    ads: {
      requestInterstitialAd: async () => { __events.push('ad'); },
      requestRewardedAd: async () => false,
    },
  };
`;
async function open(size, mobile = false, blocked = false) {
  const context = await browser.newContext({ viewport: size, isMobile: mobile, hasTouch: mobile });
  await context.route('**/*', route => {
    if (route.request().url() === 'https://www.youtube.com/game_api/v1') {
      return blocked ? route.abort() : route.fulfill({ contentType: 'application/javascript', body: sdk });
    }
    if (!route.request().url().startsWith(url)) { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  if (!blocked) await page.waitForFunction(() => typeof window.__load === 'function');
  return { context, page };
}
async function ready(page, raw = null) {
  await page.evaluate(raw => __load(raw), raw);
  await page.locator('.boot').waitFor({ state: 'detached' });
  assert.deepEqual(await page.evaluate(() => __events.slice(0, 3)), ['frame', 'load', 'ready']);
}
async function screenshot(page, name) {
  const outside = await page.locator('button:visible, input:visible, select:visible, h1:visible').evaluateAll(elements => elements.filter(el => {
    const r = el.getBoundingClientRect();
    return r.left < -1 || r.right > innerWidth + 1 || (!el.closest('[data-scroll]') && (r.top < -1 || r.bottom > innerHeight + 1));
  }).map(el => el.outerHTML));
  assert.deepEqual(outside, []);
  await page.screenshot({ path: resolve(output, `${name}.png`) });
}
try {
  const { context, page } = await open({ width: 1280, height: 720 });
  assert.deepEqual(await page.evaluate(() => __events), ['frame', 'load']);
  await ready(page, JSON.stringify({ version: 1, slots: { settings: { version: 1, data: { music: .17 } } } }));
  await screenshot(page, 'desktop-menu');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  assert.equal(await page.locator('[data-setting="music"]').inputValue(), '17');
  await page.locator('[data-setting="music"]').fill('22');
  await page.waitForFunction(() => !!window.__saved);
  assert.equal(await page.evaluate(() => JSON.parse(__saved).slots.settings.data.music), .22);
  await screenshot(page, 'desktop-settings');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  assert.equal(await page.evaluate(() => __audioContexts.length), 0); // Initially muted by host.
  await page.evaluate(() => __audio(true)); await page.keyboard.press('Shift');
  await page.waitForFunction(() => __audioContexts[0]?.state === 'running');
  await page.evaluate(() => __audio(false));
  await page.waitForFunction(() => __audioContexts[0]?.state === 'suspended');
  await page.keyboard.press('Shift');
  assert.equal(await page.evaluate(() => __audioContexts[0].state), 'suspended');
  await page.evaluate(() => __audio(true));
  await page.waitForFunction(() => __audioContexts[0]?.state === 'running');
  // Web visibility and blur must not compete with SDK callbacks.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get() { throw new Error('Page Visibility API used'); } });
    document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('blur'));
  });
  assert.equal(await page.locator('#app').getAttribute('data-screen'), 'playing');
  await screenshot(page, 'desktop-playing');
  await page.evaluate(() => __pause());
  assert.equal(await page.locator('#app').evaluate(el => el.inert), true);
  await page.waitForFunction(() => __audioContexts[0]?.state === 'suspended');
  const counts = await page.evaluate(() => [__frames, __renders, __events.length]);
  await page.keyboard.press('Escape');
  await page.locator('canvas').dispatchEvent('pointerdown', { clientX: 200, clientY: 200 });
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.waitForTimeout(120);
  assert.deepEqual(await page.evaluate(() => [__frames, __renders, __events.length]), counts);
  await page.evaluate(() => __resume());
  await page.waitForFunction(count => __frames > count, counts[0]);
  assert.equal(await page.locator('#app').getAttribute('data-screen'), 'playing');
  assert.equal(await page.evaluate(() => __events.includes('ad')), false);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await screenshot(page, 'desktop-paused');
  await page.evaluate(() => { __pause(); __resume(); });
  assert.equal(await page.locator('#app').getAttribute('data-screen'), 'paused');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  assert.equal(await page.evaluate(() => __events.includes('ad')), false);
  await context.close();

  for (const [name, size] of [ ['mobile-portrait', { width: 390, height: 844 }], ['mobile-landscape', { width: 844, height: 390 }] ]) {
    const { context, page } = await open(size, true); await ready(page);
    await screenshot(page, `${name}-menu`);
    await page.getByRole('button', { name: 'Settings', exact: true }).click(); await screenshot(page, `${name}-settings`);
    await page.getByRole('button', { name: 'Close settings' }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click(); await screenshot(page, `${name}-playing`);
    await page.getByRole('button', { name: 'Pause', exact: true }).click(); await screenshot(page, `${name}-paused`);
    await context.close();
  }
  const failed = await open({ width: 640, height: 360 });
  await failed.page.evaluate(() => __failLoad(new Error('offline')));
  await failed.page.locator('.boot').waitFor({ state: 'detached' });
  await failed.page.getByRole('button', { name: 'Settings', exact: true }).click();
  await failed.page.locator('[data-setting="music"]').fill('33');
  assert.equal(await failed.page.evaluate(() => __events.includes('save')), false);
  await failed.context.close();
  const blocked = await open({ width: 640, height: 360 }, false, true);
  await blocked.page.locator('.boot').waitFor({ state: 'detached' });
  await blocked.page.getByRole('button', { name: 'Play', exact: true }).click();
  assert.equal(await blocked.page.locator('#app').getAttribute('data-screen'), 'playing');
  await blocked.context.close();
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log('Yoola browser checks passed: SDK order/isolation, readiness, host audio/pause/render/input, cloud load/save/failures and responsive screens.');
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
