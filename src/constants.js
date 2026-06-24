import { Constants } from "@videosdk.live/react-sdk";

// VideoSDK participant modes. Fall back to the string literals so this keeps
// working even if the SDK build does not expose the Constants enum at runtime.
const sdkModes = Constants?.modes || {};

export const MODES = {
  SEND_AND_RECV: sdkModes.SEND_AND_RECV || "SEND_AND_RECV",
  SIGNALLING_ONLY: sdkModes.SIGNALLING_ONLY || "SIGNALLING_ONLY",
  RECV_ONLY: sdkModes.RECV_ONLY || "RECV_ONLY",
};

// Audience members watch the HLS broadcast (components/HlsPlayer.js) and publish
// no WebRTC media until a tutor promotes them. Demoting returns them here.
// (Use MODES.RECV_ONLY instead for low-latency live WebRTC viewing that scales
// to ~hundreds rather than the HLS broadcast that scales to thousands.)
export const AUDIENCE_MODE = MODES.SIGNALLING_ONLY;

// Students join as audience; tutors send and receive media.
export function modeForRole(role) {
  return role === "tutor" ? MODES.SEND_AND_RECV : AUDIENCE_MODE;
}

// Raise-hand → accept/reject flow (canonical "Flow A" contract). Four PubSub
// channels carrying plain-string payloads, wire-compatible across clients:
//   raiseHand        student → "<studentId>"            (I want the stage)
//   lowerHand        student → "<studentId>"            (cancel my request)
//   handResponse     tutor   → "accept:<id>"/"reject:<id>" (broadcast, targeted)
//   removeFromStage  tutor   → "<studentId>"            (get off stage)
export const TOPICS = {
  RAISE_HAND: "raiseHand",
  LOWER_HAND: "lowerHand",
  HAND_RESPONSE: "handResponse",
  REMOVE_FROM_STAGE: "removeFromStage",
};

// handResponse payload is "verb:target" — parsed like Kotlin's
// split(":", limit = 2): everything after the first colon is the target id.
export function parseHandResponse(payload) {
  const text = String(payload || "");
  const idx = text.indexOf(":");

  if (idx < 0) {
    return { verb: "", target: "" };
  }

  return { verb: text.slice(0, idx), target: text.slice(idx + 1) };
}
