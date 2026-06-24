import { useParticipant, VideoPlayer } from "@videosdk.live/react-sdk";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

export default function ParticipantTile({ participantId }) {
  const audioRef = useRef(null);
  const {
    displayName,
    isActiveSpeaker,
    isLocal,
    micOn,
    micStream,
    webcamOn,
  } = useParticipant(participantId);

  const initials = useMemo(() => {
    return String(displayName || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [displayName]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    if (micOn && micStream) {
      const mediaStream = new MediaStream();
      mediaStream.addTrack(micStream.track);
      audioRef.current.srcObject = mediaStream;
      audioRef.current.play().catch((error) => {
        console.error("Participant audio playback failed", error);
      });
      return;
    }

    audioRef.current.srcObject = null;
  }, [micOn, micStream]);

  return (
    <article className={`participant-tile ${isActiveSpeaker ? "speaking" : ""}`}>
      <audio ref={audioRef} autoPlay muted={isLocal} />

      <div className="participant-media">
        {webcamOn ? (
          <VideoPlayer
            participantId={participantId}
            type="video"
            containerStyle={{ height: "100%", width: "100%" }}
            className="video-player"
            classNameVideo="video-element"
          />
        ) : (
          <div className="avatar">{initials}</div>
        )}
      </div>

      <footer className="participant-footer">
        <span className="participant-name">
          {displayName || "Participant"}
          {isLocal ? " (You)" : ""}
        </span>
        <span className="media-state" aria-label="Media state">
          {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          {webcamOn ? <Video size={16} /> : <VideoOff size={16} />}
        </span>
      </footer>
    </article>
  );
}

