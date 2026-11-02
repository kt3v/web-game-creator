---
name: poki-sdk
description: Integrate or audit Poki SDK in web games, including lifecycle events, ad breaks, failure recovery, and Poki build requirements. Use for Poki onboarding or preparing an existing game for Poki.
---

# Poki SDK integration

Inspect the game's actual state, input, audio, persistence and build paths before
editing. Adapt to the engine and repository conventions. An existing integration
is implementation evidence, not authority over the user's request or current
Poki documentation. Preserve the requested orientation, UI language and scope.

## Current sources

Check these official pages when integrating; SDK APIs and QA rules can change.
This skill was reviewed against them on 2026-10-21.

- [Requirements](https://developers.poki.com/guide/requirements-quality)
- [HTML5 SDK](https://developers.poki.com/guide/sdk-html5)
- [Lifecycle overview](https://developers.poki.com/guide/sdk-overview)
- [Game events](https://developers.poki.com/guide/game-events)
- [External resources](https://developers.poki.com/guide/external-resources-policy)
- [Content and quality](https://developers.poki.com/guide/content-player-safety)
- [Inspector](https://developers.poki.com/guide/inspector)

## Integration decisions

- Make the Poki build explicit so upload/preview domains work. For Vite, a
  `build:poki` command with `VITE_GAME_PLATFORM=poki` is one option. A local query
  switch can support Inspector-like testing. Keep ordinary local builds independent
  when the project also ships elsewhere; hostname detection alone is insufficient.
- Load the official `https://game-cdn.poki.com/scripts/v2/poki-sdk.js` once and
  initialize early. The HTML5 guide places the script in the document head;
  conditional loaders should append it there before game startup. Bound script
  loading and init waits. On missing/blocked SDK, rejection or init timeout, load
  the game anyway. Retain the SDK reference after init rejection so lifecycle
  events can still work. Do not show custom ad-block warnings or grant ad rewards
  on failure. Ignore late loader completion after fallback.
- Fire `gameLoadingFinished()` once when the game can actually be used (assets,
  engine and first screen ready). Do not equate script download with readiness.
- Drive `gameplayStart()` / `gameplayStop()` from actual state transitions through
  one deduplicating adapter. First start follows player input, never an animated
  menu background. Stop at pause, menus, results, editing and other interruptions.
  Repeated start/start or stop/stop is invalid. Account for hidden tabs without
  losing manual pause state; returning to a tab alone is not an ad opportunity.
- Offer `commercialBreak()` when a player chooses to return from a natural pause
  to gameplay (resume, retry, next level). Do not show it on entering a pause or
  results screen. A useful conservative default is no commercial on first Play.
  Do not implement internal ad-frequency timers; Poki decides whether to show one.

## Ad transaction invariants

Stop gameplay before requesting an ad, then lock the transaction against repeated
clicks and shortcuts. Freeze simulation, clocks, spawning and all game mutations;
mute music and effects without overwriting saved player volume preferences. Block
the game's DOM and document/window input handlers, including already active drag
gestures. Keep Poki's own overlays and controls usable: never make the entire
document/body inert or install an overlay above its ad UI.

Suppress lifecycle and custom analytics for the whole pending request. A callback
that says playback started is insufficient as the only lock: it might never run.
Restore input/audio in `finally` after the SDK promise resolves or rejects, and
resume only the intended action in a visible, valid game state. Preserve hidden
tab and manual pause decisions. Do not add an arbitrary timeout that resumes the
game while an actual ad could still be playing.

Only implement rewarded ads where an optional reward mechanic is requested or
already exists. Make the video choice explicit; grant a reward exactly once only
if `rewardedBreak()` resolves `true`. False, rejection, missing SDK or ad blocking
grants nothing. Do not invent a reward economy to satisfy SDK integration. If
reward buttons are needed, apply the current guidelines: prominent video icon,
no green rewarded button, simultaneous standard continuation of equal/larger size
beside or above it, and no core progression gated behind videos.

## Build and compatibility

- Bundle runtime fonts, libraries, audio and images locally. The official Poki
  SDK is the integration endpoint, not a reason to copy its script into assets.
  Other external services require Poki approval/CSP and the applicable privacy
  policy. Do not copy a reference game's analytics services or permissions.
- Wrap storage access itself, reads, writes and parsing in failure recovery.
  Blocked/incognito storage must leave a playable in-memory session.
- Prevent arrows/Space/wheel from scrolling the parent host page while retaining
  internal game-panel scrolling. Use overscroll containment where appropriate.
- Before submission, review 16:9 iframe sizes (640×360, 836×470, 1031×580)
  and desktop and mobile/tablet controls. During development, inspect only affected
  layouts. Landscape-only is valid when that is the project's chosen orientation.
  Do not add portrait adaptation against repository/user instructions.
- Support Escape or Space pause/resume for keyboard games while respecting
  controls that already consume those keys. Keep intros skippable when applicable.
- Exclude editors, debug globals/tools, test overrides and outgoing promotional
  UI from release. Use deployable relative paths where the host path requires it.

## Optional game analytics

Use only the official optional `measure(category, what, action)` API if useful to
the request. Keep names bounded and stable, with no `/`, `^`, personal data,
timestamps or raw input. For level attempts send start then at most one complete
or fail; pause/resume does not start another attempt. Track accepted actions,
not unsuccessful clicks. Do not fabricate completion on tab close or duplicate
the SDK's automatic ad analytics. Missing or throwing measure must not affect play.

## Focused verification and handoff

For a change to Poki integration, select the specific invariant at risk: lifecycle
order, a held commercial promise, duplicate input, input/audio/simulation blocking,
ad rejection, hidden-tab completion, or SDK/storage failure. Reuse existing mocked
SDK coverage and add only a missing critical case; this list is not a mandate to
write a test for every scenario on every task. Run the smallest relevant check
once after the change. Inspect only affected screens and orientations during
development. Before submission, verify the Poki production build at its deployed
path with bundled assets and without development tools, and perform the broader
device review. A mock is not real ad certification.

Document build/test commands, event placements and deliberate omissions. Distinguish
local verification from Poki Inspector and platform QA; never claim acceptance.
Inspector upload, account configuration, thumbnails, content review, terms and
publishing are separate steps. Do not upload or publish without the user's scope
covering that action. Report concrete remaining requirements rather than expanding
an SDK task into unrelated redesign, localization or marketing work.
