# Yoola / YouTube Playables

A separate build target for publishing through Yoola. Reviewed against documentation on October 31, 2026:

- [Yoola Start Guide](https://games.yoola.app/docs/start-guide)
- [Yoola API Reference](https://games.yoola.app/docs/api-reference)
- [Yoola Monetization](https://games.yoola.app/docs/monetization)
- [YouTube Playables SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk)
- [Integration requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration)
- [Monetization requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_monetization)
- [Performance and build limits](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability)

## Build

```sh
npm run dev -- --mode yoola
npm run build:yoola
npm run test:yoola
```

The output is in `dist/`. For packaging, `index.html` must be at the archive root. Local, Poki, and Yoola builds share the same output directory; rebuild the intended variant before delivery.

Vite inserts a synchronous `<script src="https://www.youtube.com/game_api/v1"></script>` before the game bundle. The SDK is not copied and `window.ytgame` is not overridden. The Yoola bundle excludes the Poki SDK and the `?poki=1` switch. Other runtime assets are local, with relative paths. When the SDK is unavailable, the template remains locally playable; that does not replace portal testing.

## Required contracts

- `firstFrameReady()` runs once when the shell shows Loading; `gameReady()` runs after PlayCanvas and saves load, Loading is removed, and the menu is usable. The adapter deduplicates and orders these calls.
- `isAudioEnabled()` is checked at startup. `onAudioEnabledChange()` updates master audio mute. Player volume preferences remain separate and cannot override platform mute.
- `onPause()` blocks the game root and audio and stops simulation and RAF/rendering. `onResume()` restores the previous mode; manual pause stays manual. It does not request an ad.
- Yoola does not use Page Visibility or window blur handlers. The unused PlayCanvas 2.23.3 audio visibility hook is disabled as well. Recheck it with a browser test when upgrading the engine.
- SDK subscriptions are removed during destroy/HMR. Late ad results do not resume a destroyed game or grant rewards.

## Saves

In `IN_PLAYABLES_ENV`, only `ytgame.game.loadData/saveData` is used. The adapter supplies transport; `SaveStore` owns format, validation, write queuing, and error recovery.

The template saves settings, not fictional progress. The cloud container has the form `{ version: 1, slots: { settings: { version: 1, data: ... } } }`. Values are validated on read. For future progress, use the shell's existing SaveStore instance, a distinct slot, and a validator. Do not create an independent localStorage store or a second cloud container. Save at meaningful milestones, not only when the tab closes.

The game waits for a successful `loadData()` before writing to the cloud. If reading fails or times out after eight seconds, or the container has an unknown version or damaged data, play continues in memory while remote data remains untouched until the next game load. A late read does not switch the live session's storage. Writes are serialized and pending changes are combined; host pause does not initiate a new write. Failed writes retry on the next change or SDK resume, without an endless retry loop. Sent JSON is limited to less than 3 MiB; keep it below 500 KiB when practical.

Outside `IN_PLAYABLES_ENV`, cloud data is not used. Safe localStorage with in-memory fallback applies instead.

## Ads

The host shows pre-roll automatically. First Play, focus return, and Resume do not request an ad. An interstitial is allowed only when moving to a new attempt from results or the menu after a previous game; Restart from manual pause does not request one. The integration uses `ytgame.ads.requestInterstitialAd()`.

Rewarded ads use `Session.reward(grant, rewardId)` → `requestRewardedAd(rewardId)`. Pass a stable ID for the reward type without user data. Missing ID, false, failure, or unavailable SDK grants nothing; `true` grants once. The template has no reward economy or video buttons. If added, they need an explicit optional choice and a full continuation without video.

The whole ad transaction blocks gameplay, input, and sound until its promise settles, without a timeout on an active ad. If the SDK pauses, continuation waits for SDK resume. An ad failure does not prevent continuation. Monetization must also be enabled in portal settings; code alone does not do that.

## Pre-submission checks

`npm test`, `npm run test:browser`, and `npm run test:yoola` check Poki and Yoola invariants. Yoola browser tests check the production bundle, SDK/readiness ordering, cloud loading and writing, initial and changing mute, frame/render/input suspension, absence of Page Visibility and Resume ads, SDK/cloud errors, and mobile layout. Screenshots are saved in `test-results/yoola/`.

These checks use a mock SDK and are not Yoola certification. Before publishing, run the real build in the [SDK Test Suite](https://games.yoola.app/tester) and staging, verify real cloud data and ads, and complete Yoola review. A full official `ytgame.d.ts` is provided by a Yoola manager; code here declares only the API subset used by the template.

The template has no finished game, records, or content. Add `sendScore`, locale, creator video, and health telemetry only when a game needs them. If records are added, the submitted best score must match the saved best score. Prepare the finished game's cover using the [Cover Guide](https://games.yoola.app/docs/cover-guide); inventing one for an empty template is unnecessary. Also check the full [certification requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements) for the completed game, including content, accessibility, and supported devices.
