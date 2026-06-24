import { Constants, useMeeting } from "@videosdk.live/react-sdk";
import Hls from "hls.js";
import { Radio } from "lucide-react";
import { useEffect, useRef } from "react";

// Low-latency live tuning, mirroring VideoSDK's reference player.
const HLS_CONFIG = {
  maxLoadingDelay: 1,
  defaultAudioCodec: "mp4a.40.2",
  maxBufferLength: 0,
  maxMaxBufferLength: 1,
  startLevel: 0,
  startPosition: -1,
  maxBufferHole: 0.001,
  highBufferWatchdogPeriod: 0,
  nudgeOffset: 0.05,
  nudgeMaxRetry: 1,
  maxFragLookUpTolerance: 0.1,
  liveSyncDurationCount: 1,
};

export default function HlsPlayer() {
  const videoRef = useRef(null);
  const { hlsUrls, hlsState } = useMeeting();

  const playbackUrl = hlsUrls?.playbackHlsUrl || hlsUrls?.downstreamUrl;
  const isPlayable = hlsState === Constants.hlsEvents.HLS_PLAYABLE && Boolean(playbackUrl);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !isPlayable) {
      return undefined;
    }

    if (Hls.isSupported()) {
      const hls = new Hls(HLS_CONFIG);
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data?.fatal) {
          console.error("[HLS]", data.type, data.details);
        }
      });

      return () => hls.destroy();
    }

    // Safari plays HLS natively.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playbackUrl;
      const handleLoaded = () => video.play().catch(() => {});
      video.addEventListener("loadedmetadata", handleLoaded);

      return () => video.removeEventListener("loadedmetadata", handleLoaded);
    }

    console.error("HLS playback is not supported in this browser.");
    return undefined;
  }, [playbackUrl, isPlayable]);

  if (!isPlayable) {
    const stopped = hlsState === Constants.hlsEvents.HLS_STOPPED || !hlsState;

    return (
      <div className="hls-waiting" aria-live="polite">
        <Radio size={18} />
        <span>
          {stopped
            ? "Waiting for the tutor to start the class..."
            : "Connecting to the live class..."}
        </span>
      </div>
    );
  }

  return (
    <section className="hls-stage" aria-label="Live class broadcast">
      <video ref={videoRef} className="hls-video" autoPlay playsInline controls />
    </section>
  );
}
