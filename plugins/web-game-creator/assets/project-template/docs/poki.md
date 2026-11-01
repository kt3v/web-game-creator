# Poki: integration and verification

Reviewed against official documentation on October 27, 2026: [HTML5 SDK](https://developers.poki.com/guide/sdk-html5), [lifecycle](https://developers.poki.com/guide/sdk-overview), [Game Events](https://developers.poki.com/guide/game-events), and [requirements](https://developers.poki.com/guide/requirements-quality).

## Build and startup

`npm run build:poki` activates `.env.poki` and loads the official v2 SDK in the document head before game startup. This works on upload and preview hosts regardless of hostname. `npm run build` creates a standalone build; `?poki=1` also allows a manual SDK check there. Runtime assets are local; the official SDK is the sole external endpoint.

SDK download and initialization each have an eight-second bound. The game continues if either fails. An SDK reference is retained after rejected initialization for lifecycle events; a late script load after fallback does not switch the running session.

## Event placement

| Moment | Events |
| --- | --- |
| Shell and required game assets are ready | `gameLoadingFinished` once |
| First Play | `measure(level, 1, start)` → `gameplayStart` |
| Pause / settings / hidden tab / blur | `gameplayStop` |
| Resume after a stop | `commercialBreak` → `gameplayStart` |
| Restart an unfinished attempt | `commercialBreak` → fail old attempt → start new attempt → `gameplayStart` |
| Results | complete/fail attempt → `gameplayStop` |
| Play again | `commercialBreak` → start new attempt → `gameplayStart` |
| Return to menu | fail an unfinished attempt; leave a finished attempt unchanged |
| Return to tab | stay paused, without an ad or automatic resume |

Attempts and lifecycle are separate events; pause/resume does not send another attempt start. During a pending ad, SDK events are suppressed, manual actions and game mutations are blocked, and saved volume preferences remain unchanged. There are no internal ad cooldown timers; Poki decides whether to show an ad.

## Rewarded ads

`Platform.rewardedBreak` and `Session.reward(grant)` are safe extension points. The template has no reward UI because it defines no optional in-game reward. When adding a reward: explicitly offer a video, use a prominent video icon and a non-green button, and show a standard continuation of at least equal size beside or above it. Do not gate core progression behind video. Grant exactly once only when the result is `true`; missing, rejected, or blocked SDK grants nothing. After a reward, choose the next transition without another commercial. If revival is needed, add a separate Session command and test instead of calling regular resume with a second ad.

## Local checks and submission

`npm run test:browser` substitutes the SDK via browser network interception, holds the ad promise, and checks locks, mute, deduplication, results, and saves. These test hooks are absent from `dist/`. Unit tests also cover hidden completion, startup failure, and rewarded ads.

Checks include a nested `/games/starter/` path, desktop/mobile/tablet, and 640×360, 836×470, and 1031×580 iframes. Automated tests do not prove real ads or Poki acceptance.

Before submitting a specific game, open `dist/` in [Poki Inspector](https://developers.poki.com/guide/inspector). Check real overlays and event logs, assets/CSP, mobile controls, and size. The finished game also needs its own static and animated thumbnails, content, and platform review. The template uploads and publishes nothing automatically.
