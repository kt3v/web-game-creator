import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveStore } from '../src/core/storage.ts';
import { validateSettings, pixelRatio } from '../src/core/settings.ts';
import { Session } from '../src/core/session.ts';
import { PokiPlatform } from '../src/platform/poki.ts';
import type { PokiSDK } from '../src/platform/poki.ts';
import { YoolaPlatform } from '../src/platform/yoola.ts';
import type { YoolaSDK } from '../src/platform/yoola.ts';

function deferred<T = void>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture(options: Partial<PokiSDK> = {}) {
  const events: string[] = [];
  const sdk: PokiSDK = {
    init: async () => {}, gameLoadingFinished: () => events.push('loaded'),
    gameplayStart: () => events.push('start'), gameplayStop: () => events.push('stop'),
    commercialBreak: async () => { events.push('ad'); },
    measure: (c, w, a) => events.push(`${c}:${w}:${a}`), ...options,
  };
  const platform = new PokiPlatform(true, 10, sdk);
  platform.loadingFinished();
  const session = new Session(platform);
  return { platform, session, events };
}

test('lifecycle follows input; pause/resume does not start another attempt', async () => {
  const { platform, session, events } = fixture();
  platform.loadingFinished(); assert.deepEqual(events, ['loaded']);
  await session.enter('new', () => {}); session.pause(); session.pause();
  await session.enter('resume', () => {}); session.finish('complete'); session.finish('complete');
  assert.deepEqual(events, ['loaded', 'level:1:start', 'start', 'stop', 'ad', 'start', 'level:1:complete', 'stop']);
});
test('held ad locks mutations and duplicate requests before SDK callback', async () => {
  const ad = deferred(); let ads = 0, starts = 0;
  const { session, platform, events } = fixture({ commercialBreak: () => { ads++; return ad.promise; } });
  await session.enter('new', () => starts++); session.pause();
  const pending = session.enter('new', () => starts++);
  assert.equal(session.state.busy, true); assert.equal(session.active, false);
  assert.equal(await session.enter('resume', () => {}), false);
  session.menu(); session.settings(true); session.finish('fail');
  platform.measure('button', 'test', 'interact'); platform.gameplay(true);
  assert.equal(events.includes('button:test:interact'), false);
  assert.equal(session.state.screen, 'paused'); assert.equal(starts, 1);
  ad.resolve(); await pending;
  assert.equal(ads, 1); assert.equal(starts, 2); assert.equal(session.active, true);
});
test('ad rejection restores state and permits continuing', async () => {
  const { session } = fixture({ commercialBreak: async () => { throw new Error('blocked'); } });
  await session.enter('new', () => {}); session.pause(); await session.enter('resume', () => {});
  assert.equal(session.active, true); assert.equal(session.state.busy, false);
});
test('ad completion in hidden tab preserves pause; visibility return emits no ad/start', async () => {
  const ad = deferred(); const { session, events } = fixture({ commercialBreak: () => ad.promise });
  await session.enter('new', () => {}); session.pause();
  const pending = session.enter('resume', () => {}); session.visibility(true); ad.resolve(); await pending;
  const count = events.length; session.visibility(false);
  assert.equal(session.state.screen, 'paused'); assert.equal(session.active, false); assert.equal(events.length, count);
});
test('manual pause survives tab hiding; settings close never resumes', async () => {
  const { session } = fixture(); await session.enter('new', () => {});
  session.settings(true); session.visibility(true); session.visibility(false); session.settings(false);
  assert.equal(session.state.screen, 'paused'); assert.equal(session.active, false);
});
test('quit/restart sends at most one outcome for each attempt', async () => {
  const { session, events } = fixture(); await session.enter('new', () => {});
  session.pause(); await session.enter('new', () => {}); session.menu(); session.menu();
  assert.equal(events.filter(e => e === 'level:1:start').length, 2);
  assert.equal(events.filter(e => e === 'level:1:fail').length, 2);
});
test('reward granted once only on explicit true; duplicate request suppressed', async () => {
  const ad = deferred<boolean>(); const { session } = fixture({ rewardedBreak: () => ad.promise });
  let grants = 0; const pending = session.reward(() => grants++);
  assert.equal(await session.reward(() => grants++), false);
  ad.resolve(true); assert.equal(await pending, true); assert.equal(grants, 1);
});
test('missing, rejected or false rewarded SDK grants nothing', async () => {
  for (const rewardedBreak of [undefined, async () => false, async () => { throw new Error('blocked'); }]) {
    const { session } = fixture({ rewardedBreak }); let grants = 0;
    assert.equal(await session.reward(() => grants++), false); assert.equal(grants, 0); assert.equal(session.state.busy, false);
  }
});
test('SDK init rejection/timeout still permits loading and lifecycle', async () => {
  for (const init of [async () => { throw new Error('blocked'); }, () => new Promise(() => {})]) {
    const { platform, events } = fixture({ init }); await platform.init();
    platform.gameplay(true); assert.equal(events.at(-1), 'start');
  }
});
test('destroy during ad cannot resurrect game or grant a late reward', async () => {
  const ad = deferred<boolean>(); const { session } = fixture({ rewardedBreak: () => ad.promise });
  let grants = 0; const pending = session.reward(() => grants++); session.destroy(); ad.resolve(true); await pending;
  assert.equal(grants, 0); assert.equal(session.active, false);
});
test('analytics rejects unbounded/raw paths and survives throwing optional API', () => {
  const { platform, events } = fixture(); platform.measure('level', 'a/b', 'start'); platform.measure('x', '^', 'a');
  assert.deepEqual(events, ['loaded']);
  const broken = fixture({ measure: () => { throw new Error(); } });
  assert.doesNotThrow(() => broken.platform.measure('level', '1', 'start'));
});
test('blocked storage getter and failed writes retain session saves', () => {
  for (const backend of [() => { throw new Error('denied'); }, () => ({ getItem: () => null, setItem: () => { throw new Error('quota'); } })]) {
    const store = new SaveStore('test', backend);
    const settings = store.read('settings', validateSettings); settings.music = .12;
    store.write('settings', settings); assert.equal(store.read('settings', validateSettings).music, .12);
  }
});
test('save versions/malformed data and settings values validate safely', () => {
  for (const raw of ['broken', '{"version":9,"data":{"music":0}}', 'null']) {
    const store = new SaveStore('test', () => ({ getItem: () => raw, setItem: () => {} }));
    assert.equal(store.read('settings', validateSettings).music, .35);
  }
  const clean = validateSettings({ music: 99, effects: NaN, uiMode: 'hacker', reducedMotion: true });
  assert.equal(clean.music, 1); assert.equal(clean.effects, .8); assert.equal(clean.uiMode, 'auto'); assert.equal(clean.reducedMotion, true);
  assert.equal(pixelRatio('low', true, 3), .75); assert.equal(pixelRatio('high', false, 3), 2);
});

function yoolaFixture(options: Partial<YoolaSDK['ads']> = {}) {
  const events: string[] = [];
  let pause = () => {}, resume = () => {}, audio = (_enabled: boolean) => {};
  let removed = 0;
  const sdk: YoolaSDK = {
    IN_PLAYABLES_ENV: true,
    game: { firstFrameReady: () => events.push('frame'), gameReady: () => events.push('ready'),
      loadData: async () => null, saveData: async () => {} },
    system: { isAudioEnabled: () => false,
      onPause: fn => { pause = fn; return () => { removed++; }; },
      onResume: fn => { resume = fn; return () => { removed++; }; },
      onAudioEnabledChange: fn => { audio = fn; return () => { removed++; }; } },
    ads: { requestInterstitialAd: async () => { events.push('ad'); },
      requestRewardedAd: async id => { events.push(id); return true; }, ...options },
  };
  const platform = new YoolaPlatform(sdk);
  const session = new Session(platform);
  platform.subscribe(() => session.suspend(platform.hostState.paused));
  return { sdk, platform, session, events, pause: () => pause(), resume: () => resume(), audio: (enabled: boolean) => audio(enabled), removed: () => removed };
}
test('Yoola signals readiness in order once, honors host audio and releases subscriptions', async () => {
  const f = yoolaFixture(); await f.platform.init(); await f.platform.init();
  assert.equal(f.platform.hostState.audioEnabled, false);
  f.platform.firstFrameReady(); f.platform.loadingFinished(); f.platform.loadingFinished();
  assert.deepEqual(f.events, ['frame', 'ready']);
  f.audio(true); assert.equal(f.platform.hostState.audioEnabled, true);
  f.platform.destroy(); f.platform.destroy(); assert.equal(f.removed(), 3);
  f.audio(false); assert.equal(f.platform.hostState.audioEnabled, true);
});
test('Yoola host pause resumes previous gameplay without ads and preserves manual pause', async () => {
  const f = yoolaFixture(); await f.platform.init(); f.platform.loadingFinished();
  await f.session.enter('new', () => {}); f.pause();
  assert.equal(f.session.active, false); assert.equal(f.session.state.suspended, true);
  f.session.menu(); f.session.settings(true);
  assert.equal(await f.session.enter('new', () => {}), false);
  f.resume(); assert.equal(f.session.active, true);
  f.session.pause(); f.pause(); f.resume(); assert.equal(f.session.state.screen, 'paused');
  await f.session.enter('resume', () => {}); assert.equal(f.events.includes('ad'), false);
});
test('Yoola interstitial only follows a content transition; held request locks until host resume', async () => {
  const ad = deferred(); const f = yoolaFixture({ requestInterstitialAd: () => { f.events.push('ad'); return ad.promise; } });
  await f.platform.init(); f.platform.loadingFinished();
  await f.session.enter('new', () => {}); f.session.finish('complete');
  let starts = 0; const pending = f.session.enter('new', () => { starts++; });
  assert.equal(f.platform.adPending, true); assert.equal(f.session.state.busy, true);
  assert.equal(await f.session.enter('new', () => {}), false);
  f.pause(); ad.resolve(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(starts, 0); assert.equal(f.session.state.busy, true);
  f.resume(); await pending;
  assert.equal(starts, 1); assert.equal(f.session.active, true);
  assert.equal(f.events.filter(e => e === 'ad').length, 1);
});
test('Yoola rewarded requires a stable explicit ID, grants only true, and handles rejection/destroy', async () => {
  for (const outcome of [true, false, 'reject', 'destroy'] as const) {
    const ad = deferred<boolean>(); const f = yoolaFixture({ requestRewardedAd: () => ad.promise });
    await f.platform.init(); let grants = 0;
    assert.equal(await f.session.reward(() => grants++), false);
    const pending = f.session.reward(() => grants++, 'extra-life');
    assert.equal(await f.session.reward(() => grants++, 'extra-life'), false);
    if (outcome === 'destroy') f.session.destroy();
    if (outcome === 'reject') ad.reject(new Error('no fill')); else ad.resolve(outcome === true || outcome === 'destroy');
    await pending; assert.equal(grants, outcome === true ? 1 : 0); assert.equal(f.platform.adPending, false);
  }
});
test('Yoola rejected interstitial and outside-host SDK permit play without fake rewards', async () => {
  const f = yoolaFixture({ requestInterstitialAd: async () => { throw new Error('no fill'); } });
  await f.platform.init(); await f.session.enter('new', () => {}); f.session.finish('complete');
  await f.session.enter('new', () => {}); assert.equal(f.session.active, true);
  f.sdk.IN_PLAYABLES_ENV = false;
  assert.equal(f.platform.cloudData, undefined); assert.equal(await f.platform.rewardedBreak('extra-life'), false);
});
test('cloud saves load before writing, validate slots, serialize writes, and suspend network', async () => {
  const load = deferred<string | null>(), first = deferred(); const writes: string[] = [];
  const store = new SaveStore('cloud', () => { throw new Error('must never access localStorage'); }, {
    loadData: () => load.promise,
    saveData: data => { writes.push(data); return writes.length === 1 ? first.promise : Promise.resolve(); },
  });
  const loading = store.initialize();
  assert.equal(store.read('settings', validateSettings).music, .35);
  assert.equal(writes.length, 0);
  load.resolve(JSON.stringify({ version: 1, slots: { settings: { version: 1, data: { music: .12, effects: 99 } } } }));
  await loading;
  const settings = store.read('settings', validateSettings);
  assert.equal(settings.music, .12); assert.equal(settings.effects, 1);
  store.write('settings', { ...settings, music: .2 });
  store.write('settings', { ...settings, music: .3 });
  store.setSuspended(true); first.resolve(); await store.flush();
  assert.equal(writes.length, 1);
  store.setSuspended(false); await store.flush();
  assert.equal(writes.length, 2); assert.equal(JSON.parse(writes[1]).slots.settings.data.music, .3);
});
test('failed, timed-out, malformed or future cloud loads cannot overwrite remote data', async () => {
  for (const loadData of [async () => { throw new Error('unavailable'); }, () => new Promise<string | null>(() => {}),
    async () => 'broken', async () => '{"version":2,"slots":{}}']) {
    let writes = 0;
    const store = new SaveStore('cloud', undefined, { loadData, saveData: async () => { writes++; } });
    await store.initialize(5); store.write('settings', validateSettings({ music: .1 })); await store.flush();
    assert.equal(writes, 0); assert.equal(store.read('settings', validateSettings).music, .1);
    store.destroy();
  }
});
