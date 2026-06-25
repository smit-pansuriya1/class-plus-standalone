# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Create React App (react-scripts 5). No backend, no test files currently exist.

- `npm install` — install deps
- `npm start` — dev server on http://localhost:3000
- `npm run build` — production build into `build/`
- `npm test` — Jest watcher (CRA's `react-app/jest` config)
- `npm test -- --watchAll=false src/App.test.js` — run a single test file once (non-watch)

There is no separate lint command; ESLint (`react-app` + `react-app/jest`) runs as part of `react-scripts start`/`build`.

## Configuration (no backend)

Everything the app needs is hardcoded in `src/config.js`:
- `TOKEN` — VideoSDK JWT; must carry `allow_join` + `allow_mod`.
- `MEETING_ID` — a pre-existing room id; **every visitor joins this same meeting**.
- `SIGNALING_BASE_URL` — must match the token's environment, or `""` for default VideoSDK signaling.

There is no room creation, token minting, or `/end-meeting` endpoint — the tutor ends the session client-side via `meeting.end()`. The full app's webhook-driven features (tutor-left auto-end timer, live webhook events panel) are intentionally absent because they required server-sent events.

## Architecture

Single-page client built entirely on `@videosdk.live/react-sdk`. Two screens:

1. **Lobby** (`src/App.js`) — collects display name, role (tutor/student), and for students a watch mode. On submit it renders `MeetingRoom`. App.js derives three things passed down as props:
   - `audienceMode`: tutor → `SEND_AND_RECV`; student "zero-lag" → `RECV_ONLY`; student "HLS" → `SIGNALLING_ONLY`.
   - `participantId`: `<5 digits>_<roleCode>` where roleCode `3`=tutor, `1`=student.
   - `displayName`: tutor names are forced to start with `"Tutor "`.

2. **Meeting** (`src/components/MeetingRoom.js`) — `MeetingRoom` wraps everything in `MeetingProvider` (joins with mic/cam off, `multiStream: true`). The real logic lives in the inner `MeetingSurface` component, which must be a child of the provider to use the SDK hooks.

### Participant modes drive the entire UI

`src/constants.js` defines `MODES` (with string-literal fallbacks if the SDK enum is missing at runtime). A participant's `mode` decides what they see and can do:
- `SEND_AND_RECV` — on stage, publishing media (tutor + promoted students). Rendered in the live `participant-grid`; gets media controls.
- `RECV_ONLY` — "zero-lag" audience: watches the live WebRTC grid (no self-tile), low latency, scales to ~hundreds.
- `SIGNALLING_ONLY` (`AUDIENCE_MODE`) — HLS audience: renders `HlsPlayer` instead of the grid, scales to thousands but is delayed.

`MeetingSurface` keeps a `localMode` in state and flips it with `meeting.changeMode(...)` when a student is promoted/demoted. `showGrid = localMode !== SIGNALLING_ONLY` chooses grid vs. HLS. `StageTile` filters out non-`SEND_AND_RECV` participants so audience members don't appear as empty tiles.

### Raise-hand promote/demote — "Flow A" PubSub contract

The only cross-client coordination is four `usePubSub` channels carrying **plain strings** (no JSON), defined in `src/constants.js` `TOPICS`. This wire format is deliberately compatible with the other (Kotlin/etc.) ClassPlus clients — preserve it when editing:
- `raiseHand` — student publishes its own id → tutor adds to `pendingHands`.
- `lowerHand` — student cancels → tutor removes from `pendingHands`.
- `handResponse` — tutor broadcasts `"accept:<id>"` / `"reject:<id>"`; every student receives it but acts only if `<id>` matches its own. Parsed by `parseHandResponse` (split on the **first** colon, mirroring Kotlin `split(":", limit=2)`).
- `removeFromStage` — tutor publishes a student id → that student calls `downgradeToAudience()`.

On accept, the student calls `changeMode(SEND_AND_RECV)` and gets a **mic-only** control (camera + screen share stay tutor-only — see `Controls.js`). Chat is a separate `usePubSub("CHAT", { persist: true })` in `ChatPanel.js`.

### Media specifics

- Tutor media starts in `onMeetingJoined`: webcam via default camera (no custom track), mic via a custom `createMicrophoneAudioTrack` with noise suppression/echo/AGC.
- `PresenterView` renders the active `meeting.presenterId`'s screen-share track (returns null unless `screenShareOn`).
- `HlsPlayer` tunes hls.js for low-latency live (`HLS_CONFIG`), falls back to Safari native HLS, and shows a waiting state keyed off `hlsState`/`Constants.hlsEvents`.

## Editing guardrails

- Keep the raise-hand payloads as plain strings in the exact `TOPICS` channels — they are a cross-client contract, not internal-only.
- Role/permission asymmetry is intentional: promoted students get mic only; camera and screen share remain tutor-only.
