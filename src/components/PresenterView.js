import { useParticipant } from "@videosdk.live/react-sdk";
import { MonitorUp } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

export default function PresenterView({ presenterId }) {
  const videoRef = useRef(null);
  const {
    displayName,
    isLocal,
    screenShareStream,
    screenShareOn,
  } = useParticipant(presenterId);

  const mediaStream = useMemo(() => {
    if (screenShareOn && screenShareStream) {
      const stream = new MediaStream();
      stream.addTrack(screenShareStream.track);
      return stream;
    }

    return null;
  }, [screenShareOn, screenShareStream]);

  useEffect(() => {
    const node = videoRef.current;

    if (!node) {
      return;
    }

    node.srcObject = mediaStream;

    if (mediaStream) {
      node.play().catch((error) => {
        console.error("Screen share playback failed", error);
      });
    }
  }, [mediaStream]);

  if (!screenShareOn) {
    return null;
  }

  return (
    <section className="presenter-view" aria-label="Shared screen">
      <video ref={videoRef} autoPlay playsInline muted className="presenter-video" />
      <div className="presenter-label">
        <MonitorUp size={16} />
        <span>
          {isLocal ? "You are presenting" : `${displayName || "Presenter"} is presenting`}
        </span>
      </div>
    </section>
  );
}
