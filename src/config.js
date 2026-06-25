// Hardcoded VideoSDK config — no backend.
//
// 1) Paste a VideoSDK token (generate one in the VideoSDK dashboard or your
//    token service). It must have `allow_join` + `allow_mod` permissions.
// 2) Paste an existing meeting/room id (create one once via the VideoSDK API or
//    dashboard). Everyone who opens this app joins the SAME meeting.
// 3) SIGNALING_BASE_URL must match the environment your token belongs to.
//    Leave it "" to use the default public VideoSDK signaling.

export const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiI4N2I3MmYyYy1mOTc3LTQyMjktODQxMS0wZTIxYzc1N2IyNGMiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc4MjM4MjQ1OCwiZXhwIjoxODEzOTE4NDU4fQ.SioD3xXO0NXSpqKI3um3CWGiwgHSBxclpyrkzhLOqZ4";

export const MEETING_ID = "z2uc-axz4-pm4n";

// e.g. "api.classplus-dev.videosdk.live" for the Classplus dev deployment,
// or "" to use the default api.videosdk.live signaling.
export const SIGNALING_BASE_URL = "api.classplus-dev.videosdk.live";
