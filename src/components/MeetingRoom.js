import {
  createMicrophoneAudioTrack,
  MeetingProvider,
  useMeeting,
  useParticipant,
  usePubSub,
} from "@videosdk.live/react-sdk";
import { Check, Copy, Hand, Radio, UserMinus, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { SIGNALING_BASE_URL } from "../config";
import {
  AUDIENCE_MODE,
  MODES,
  TOPICS,
  parseHandResponse,
} from "../constants";
import ChatPanel from "./ChatPanel";
import Controls from "./Controls";
import HlsPlayer from "./HlsPlayer";
import ParticipantTile from "./ParticipantTile";
import PresenterView from "./PresenterView";

// Only participants actively sending media (the tutor + promoted students)
// belong on the stage. Audience members (RECV_ONLY / SIGNALLING_ONLY) still
// appear in meeting.participants, so filter them out here.
function StageTile({ participantId }) {
  const { mode } = useParticipant(participantId);

  if (mode && mode !== MODES.SEND_AND_RECV) {
    return null;
  }

  return <ParticipantTile participantId={participantId} />;
}

// One row in the tutor's panel. The raiseHand payload only carries the student
// id, so the display name is resolved from the participant here. Actions just
// invoke the parent, which publishes on the shared broadcast channels.
function StudentModeRow({ participantId, variant, onAccept, onReject, onRemove }) {
  const { displayName } = useParticipant(participantId);

  return (
    <li className="request-row">
      <span className="request-name">{displayName || participantId}</span>
      {variant === "pending" ? (
        <div className="request-actions">
          <button
            type="button"
            className="request-accept"
            onClick={() => onAccept(participantId)}
          >
            <Check size={16} /> Accept
          </button>
          <button
            type="button"
            className="request-dismiss"
            onClick={() => onReject(participantId)}
            title="Reject"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="request-remove"
          onClick={() => onRemove(participantId)}
        >
          <UserMinus size={16} /> Remove
        </button>
      )}
    </li>
  );
}

function MeetingSurface({ roomId, role, audienceMode, onMeetingEnd }) {
  const [status, setStatus] = useState("joining");
  const [copied, setCopied] = useState(false);
  const [localMode, setLocalMode] = useState(
    role === "tutor" ? MODES.SEND_AND_RECV : audienceMode
  );
  const [handRaised, setHandRaised] = useState(false);
  const [notice, setNotice] = useState(""); // student: transient message (e.g. rejected)
  const [pendingHands, setPendingHands] = useState([]); // tutor: ids with hands up
  const [active, setActive] = useState([]); // tutor: promoted (on-stage) ids
  const [activePanel, setActivePanel] = useState(null); // "chat" | "webhooks" | null

  const isTutor = role === "tutor";

  const togglePanel = (panel) =>
    setActivePanel((current) => (current === panel ? null : panel));

  const meeting = useMeeting({
    onMeetingJoined: async () => {
      setStatus("live");

      // Everyone joins with mic + camera off. The tutor then starts both:
      // the webcam with the default camera (no custom track) and the mic with
      // a custom audio track.
      if (isTutor) {
        try {
          meeting.enableWebcam();
          const audioTrack = await createMicrophoneAudioTrack({
            encoderConfig: "high_quality",
            noiseConfig: {
              noiseSuppression: true,
              echoCancellation: true,
              autoGainControl: true,
            },
          });
          meeting.unmuteMic(audioTrack);
        } catch (error) {
          console.error("[Tutor] failed to start media", error);
        }

        // Start the HLS broadcast so SIGNALLING_ONLY (HLS) audience can watch.
        // No backend: the tutor triggers it client-side on join.
        try {
          meeting.startHls({
            layout: { type: "SPOTLIGHT", priority: "SPEAKER", gridSize: 4 },
            theme: "DARK",
            mode: "video-and-audio",
            quality: "high",
            orientation: "landscape",
          });
        } catch (error) {
          console.error("[Tutor] failed to start HLS", error);
        }
      }
    },
    onMeetingLeft: onMeetingEnd,
    onError: (error) => {
      console.error("[VideoSDK]", error);
      setStatus("error");
    },
  });

  const localParticipantId = meeting.localParticipant?.id;

  const downgradeToAudience = () => {
    meeting.changeMode(audienceMode);
    setLocalMode(audienceMode);
    meeting.disableWebcam?.();
    meeting.muteMic?.();
    meeting.disableScreenShare?.();
  };

  // --- Flow A: four plain-string PubSub channels (no JSON) -------------------

  // raiseHand: student publishes its own id; the tutor tracks pending hands.
  const { publish: publishRaiseHand } = usePubSub(TOPICS.RAISE_HAND, {
    onMessageReceived: ({ message, senderId }) => {
      const id = message || senderId;
      if (!isTutor || !id) {
        return;
      }
      setPendingHands((prev) => (prev.includes(id) ? prev : [...prev, id]));
    },
  });

  // lowerHand: student cancels its request; the tutor drops it from pending.
  const { publish: publishLowerHand } = usePubSub(TOPICS.LOWER_HAND, {
    onMessageReceived: ({ message, senderId }) => {
      const id = message || senderId;
      if (!isTutor || !id) {
        return;
      }
      setPendingHands((prev) => prev.filter((x) => x !== id));
    },
  });

  // handResponse: tutor broadcasts "accept:<id>"/"reject:<id>"; each student
  // reacts only to the response addressed to it.
  const { publish: publishHandResponse } = usePubSub(TOPICS.HAND_RESPONSE, {
    onMessageReceived: ({ message }) => {
      const { verb, target } = parseHandResponse(message);
      if (target !== localParticipantId) {
        return;
      }

      setHandRaised(false);

      if (verb === "accept") {
        meeting.changeMode(MODES.SEND_AND_RECV);
        setLocalMode(MODES.SEND_AND_RECV);
      } else if (verb === "reject") {
        setNotice("The tutor declined your request.");
        window.setTimeout(() => setNotice(""), 4000);
      }
    },
  });

  // removeFromStage: tutor publishes the id; that on-stage student downgrades.
  const { publish: publishRemoveFromStage } = usePubSub(TOPICS.REMOVE_FROM_STAGE, {
    onMessageReceived: ({ message }) => {
      if (message === localParticipantId) {
        downgradeToAudience();
      }
    },
  });

  // Student raise/lower (the control button toggles between the two).
  const handleRaiseHand = () => {
    if (!localParticipantId) {
      return;
    }

    if (handRaised) {
      publishLowerHand(localParticipantId, { persist: false });
      setHandRaised(false);
    } else {
      publishRaiseHand(localParticipantId, { persist: false });
      setHandRaised(true);
    }
  };

  // Tutor intents.
  const acceptHand = (id) => {
    publishHandResponse(`accept:${id}`, { persist: false });
    setPendingHands((prev) => prev.filter((x) => x !== id));
    setActive((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const rejectHand = (id) => {
    publishHandResponse(`reject:${id}`, { persist: false });
    setPendingHands((prev) => prev.filter((x) => x !== id));
  };

  const removeFromStage = (id) => {
    publishRemoveFromStage(id, { persist: false });
    setActive((prev) => prev.filter((x) => x !== id));
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Unable to copy room ID", error);
    }
  };

  const presenterId = meeting.presenterId;
  const isOnStage = localMode === MODES.SEND_AND_RECV;
  // HLS audience (SIGNALLING_ONLY) watches the broadcast; everyone else
  // (tutor, promoted students, zero-lag RECV_ONLY audience) uses the live grid.
  const showGrid = localMode !== MODES.SIGNALLING_ONLY;
  const participantIds = Array.from(meeting.participants?.keys?.() || []).filter(
    (id) => id !== localParticipantId
  );
  const totalParticipants = participantIds.length + (localParticipantId ? 1 : 0);

  return (
    <div className="meeting-shell">
      <header className="meeting-header">
        <div className="meeting-brand">
          <span className="brand-logo" aria-hidden="true">CP</span>
          <span className="brand-name">ClassPlus</span>
        </div>

        <div className="meeting-meta">
          <span className={`status-pill ${status}`}>
            <Radio size={14} />
            {status}
          </span>
          <button className="room-copy" type="button" onClick={copyRoomId} title="Copy room ID">
            <span>{roomId}</span>
            <Copy size={16} />
          </button>
        </div>

        <div className="participant-count">
          <UsersRound size={18} />
          <span>{totalParticipants}</span>
        </div>
      </header>

      {showGrid && presenterId ? <PresenterView presenterId={presenterId} /> : null}

      {isTutor && (pendingHands.length > 0 || active.length > 0) ? (
        <aside className="request-panel" aria-label="Raise-hand requests">
          {pendingHands.length > 0 ? (
            <div className="request-group">
              <h2>
                <Hand size={16} /> Requests
              </h2>
              <ul>
                {pendingHands.map((id) => (
                  <StudentModeRow
                    key={id}
                    participantId={id}
                    variant="pending"
                    onAccept={acceptHand}
                    onReject={rejectHand}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {active.length > 0 ? (
            <div className="request-group">
              <h2>On stage</h2>
              <ul>
                {active.map((id) => (
                  <StudentModeRow
                    key={id}
                    participantId={id}
                    variant="active"
                    onRemove={removeFromStage}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      ) : null}

      {showGrid ? (
        <section className="participant-grid" aria-label="Participants">
          {isOnStage && localParticipantId ? (
            <ParticipantTile participantId={localParticipantId} />
          ) : null}

          {participantIds.map((participantId) => (
            <StageTile key={participantId} participantId={participantId} />
          ))}
        </section>
      ) : (
        <HlsPlayer />
      )}

      {activePanel === "chat" ? <ChatPanel onClose={() => setActivePanel(null)} /> : null}

      {copied ? <div className="toast">Room ID copied</div> : null}
      {notice ? <div className="toast">{notice}</div> : null}

      <Controls
        role={role}
        localMode={localMode}
        handRaised={handRaised}
        onRaiseHand={handleRaiseHand}
        canEndMeeting={isTutor}
        onMeetingEnd={onMeetingEnd}
        activePanel={activePanel}
        onToggleChat={() => togglePanel("chat")}
      />
    </div>
  );
}

export default function MeetingRoom({
  roomId,
  token,
  displayName,
  participantId,
  role,
  audienceMode = AUDIENCE_MODE,
  onMeetingEnd,
}) {
  const joinMode = role === "tutor" ? MODES.SEND_AND_RECV : audienceMode;

  return (
    <MeetingProvider
      config={{
        meetingId: roomId,
        participantId,
        micEnabled: false,
        webcamEnabled: false,
        name: displayName,
        mode: joinMode,
        isTutor: role === "tutor",
        metaData: {
          role,
          isTutor: role === "tutor",
        },
        multiStream: true,
        debugMode: true,
        // Only set when configured; omit to use the default VideoSDK signaling.
        ...(SIGNALING_BASE_URL ? { signalingBaseUrl: SIGNALING_BASE_URL } : {}),
      }}
      token={token}
      joinWithoutUserInteraction
    >
      <MeetingSurface
        roomId={roomId}
        role={role}
        audienceMode={audienceMode}
        onMeetingEnd={onMeetingEnd}
      />
    </MeetingProvider>
  );
}
