# Class Pluss — Standalone (no backend)

A backend-free React frontend for VideoSDK live classes. The token and meeting id
are hardcoded in `src/config.js`; there is no server. Same in-meeting feature set
as the full app — **chat, raise-hand promote/demote, screen share, HLS audience,
zero-lag audience, tutor/student roles** — all client-side.

## Setup

1. Edit `src/config.js`:
   - `TOKEN` — a VideoSDK token with `allow_join` + `allow_mod` permissions.
   - `MEETING_ID` — an existing room id (everyone joins the same meeting).
   - `SIGNALING_BASE_URL` — match your token's environment, or `""` for default
     VideoSDK signaling.
2. Install and run:

   ```bash
   npm install
   npm start
   ```

   Opens on `http://localhost:3000`.

## How it works

- **Lobby** (`App.js`): enter a name, pick **Tutor** or **Student**; a student also
  picks a watch mode (**HLS** = delayed broadcast, **zero lag** = live WebRTC).
  "Join class" enters the hardcoded meeting.
- **Tutor**: joins on stage; mic + camera start after joining (camera = default,
  mic = custom audio track); can screen-share; sees raise-hand requests and
  Accept/Reject/Remove. **End meeting** ends the VideoSDK session for everyone
  (`meeting.end()` — no backend).
- **Student**: joins as audience (HLS player or live `RECV_ONLY` grid, no self-tile),
  raises a hand; on Accept switches to `SEND_AND_RECV` (mic only); on Remove/Reject
  returns to audience.
- **Chat**: `usePubSub("CHAT", { persist: true })`.
- **Raise-hand**: the four plain-string PubSub channels `raiseHand` / `lowerHand` /
  `handResponse` / `removeFromStage` (see `src/constants.js`).

## Not included (needed a backend)

- Room creation, token minting, and the `/end-meeting` API → token + id are
  hardcoded; end is done client-side.
- The webhook-driven **tutor-left auto-end timer** and the live **webhook events**
  panel (both required server-sent events from the backend).
