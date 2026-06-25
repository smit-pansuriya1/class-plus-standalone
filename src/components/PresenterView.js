import { useParticipant } from "@videosdk.live/react-sdk";
import { MonitorUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export default function PresenterView({ presenterId }) {
  const videoRef = useRef(null);
  const {
    displayName,
    isLocal,
    screenShareStream,
    screenShareOn,
    getShareStats,
  } = useParticipant(presenterId);

  // Poll the screen-share WebRTC stats once a second while the share is live.
  // getShareStats() resolves to an array of per-track samples — we read the
  // first entry (stats[0]) for resolution / fps / bitrate.
  const [shareStats, setShareStats] = useState(null);

  useEffect(() => {
    if (!screenShareOn || !getShareStats) {
      setShareStats(null);
      return undefined;
    }

    let active = true;

    const fetchStats = async () => {
      try {
        const stats = await getShareStats();
        if (active) {
          setShareStats(Array.isArray(stats) ? stats[0] : stats);
        }
      } catch (error) {
        console.error("Failed to read screen share stats", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [screenShareOn, getShareStats]);

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

  const width = shareStats?.size?.width;
  const height = shareStats?.size?.height;
  const fps = shareStats?.size?.framerate;
  const bitrateKbps =
    shareStats?.bitrate != null ? Math.round(shareStats.bitrate) : null;

  return (
    <section className="presenter-view" aria-label="Shared screen">
      <video ref={videoRef} autoPlay playsInline muted className="presenter-video" />
      {shareStats ? (
        <div className="presenter-stats" aria-label="Screen share stats">
          {width && height ? <span>{`${width}×${height}`}</span> : null}
          {fps ? <span>{`${Math.round(fps)} fps`}</span> : null}
          {bitrateKbps != null ? <span>{`${bitrateKbps} kbps`}</span> : null}
        </div>
      ) : null}
      <div className="presenter-label">
        <MonitorUp size={16} />
        <span>
          {isLocal ? "You are presenting" : `${displayName || "Presenter"} is presenting`}
        </span>
      </div>
    </section>
  );
}
