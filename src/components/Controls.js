import { useMeeting } from "@videosdk.live/react-sdk";
import {
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { MODES } from "../constants";

export default function Controls({
  role,
  localMode,
  handRaised,
  onRaiseHand,
  canEndMeeting,
  onMeetingEnd,
  activePanel,
  onToggleChat,
}) {
  const {
    end,
    leave,
    localMicOn,
    localWebcamOn,
    localScreenShareOn,
    toggleMic,
    toggleWebcam,
    toggleScreenShare,
  } = useMeeting();

  // A participant can publish media only in SEND_AND_RECV mode. Students start
  // as audience (SIGNALLING_ONLY) and gain controls once promoted — but a
  // promoted student gets the mic toggle only; camera + screen share stay
  // tutor-only.
  const isTutor = role === "tutor";
  const canSendMedia = localMode === MODES.SEND_AND_RECV;
  const canRaiseHand = !isTutor && !canSendMedia;

  const handleLeave = () => {
    leave();
  };

  // No backend: the tutor ends the VideoSDK session for everyone directly.
  const handleEndMeeting = () => {
    end();
    onMeetingEnd();
  };

  return (
    <nav className="control-bar" aria-label="Meeting controls">
      {canSendMedia ? (
        <>
          <button
            type="button"
            className={`control-button ${localMicOn ? "" : "off"}`}
            onClick={() => toggleMic()}
            title={localMicOn ? "Mute microphone" : "Unmute microphone"}
            aria-label={localMicOn ? "Mute microphone" : "Unmute microphone"}
          >
            {localMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          {isTutor ? (
            <>
              <button
                type="button"
                className={`control-button ${localWebcamOn ? "" : "off"}`}
                onClick={() => toggleWebcam()}
                title={localWebcamOn ? "Turn camera off" : "Turn camera on"}
                aria-label={localWebcamOn ? "Turn camera off" : "Turn camera on"}
              >
                {localWebcamOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>

              <button
                type="button"
                className={`control-button ${localScreenShareOn ? "active" : ""}`}
                onClick={() => toggleScreenShare()}
                title={localScreenShareOn ? "Stop sharing screen" : "Share screen"}
                aria-label={localScreenShareOn ? "Stop sharing screen" : "Share screen"}
              >
                {localScreenShareOn ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
              </button>
            </>
          ) : null}
        </>
      ) : null}

      {canRaiseHand ? (
        <button
          type="button"
          className={`control-button raise-hand ${handRaised ? "active" : ""}`}
          onClick={onRaiseHand}
          title={handRaised ? "Lower hand (cancel request)" : "Raise hand to speak"}
          aria-label={handRaised ? "Lower hand (cancel request)" : "Raise hand to speak"}
        >
          <Hand size={20} />
        </button>
      ) : null}

      <button
        type="button"
        className={`control-button ${activePanel === "chat" ? "active" : ""}`}
        onClick={onToggleChat}
        title="Chat"
        aria-label="Toggle chat"
      >
        <MessageSquare size={20} />
      </button>

      <button
        type="button"
        className="control-button leave"
        onClick={handleLeave}
        title="Leave meeting"
        aria-label="Leave meeting"
      >
        <PhoneOff size={20} />
      </button>

      {canEndMeeting ? (
        <button type="button" className="end-button" onClick={handleEndMeeting}>
          <PhoneOff size={18} />
          End meeting
        </button>
      ) : null}
    </nav>
  );
}
