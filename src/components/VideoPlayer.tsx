import { useRef, useState, useEffect, useCallback } from "react";
import { getStreamUrl, formatTime } from "../api";
import { PlayIcon, PauseIcon, VolumeIcon, VolumeMuteIcon } from "./Icons";

interface VideoPlayerProps {
  slug: string;
  fileType: string;
  isActive: boolean;
  accentColor?: string;
}

export function VideoPlayer({ slug, fileType, isActive, accentColor = "#7c5cfc" }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loaded, setLoaded] = useState(false);

  const isImage = fileType.startsWith("image/");
  const streamUrl = getStreamUrl(slug);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || isImage) return;

    if (isActive) {
      v.muted = muted;
      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setPlaying(true)).catch(() => {
          v.muted = true;
          setMuted(true);
          v.play().then(() => setPlaying(true)).catch(() => {});
        });
      }
    } else {
      v.pause();
      v.currentTime = 0;
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    }
  }, [isActive, isImage]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || isImage) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
    showControlsBriefly();
  }, [isImage]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v || isImage) return;
    const newMuted = !v.muted;
    v.muted = newMuted;
    setMuted(newMuted);
    showControlsBriefly();
  }, [isImage]);

  const showControlsBriefly = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 2500);
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.duration) setProgress((v.currentTime / v.duration) * 100);
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setLoaded(true);
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    const bar = progressRef.current;
    if (!v || !bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
  };

  const handleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showControls) {
      togglePlay();
    } else {
      showControlsBriefly();
    }
  };

  if (isImage) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <img
          src={streamUrl}
          alt=""
          className="max-w-full max-h-full object-contain"
          style={{ userSelect: "none" }}
        />
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full bg-black overflow-hidden cursor-pointer"
      onClick={handleTap}
    >
      <video
        ref={videoRef}
        src={streamUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={muted}
        preload={isActive ? "auto" : "metadata"}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onCanPlay={() => setLoaded(true)}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-transparent pointer-events-none" />

      {/* Center play/pause indicator */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
        >
          {playing ? (
            <PauseIcon size={28} className="text-white" />
          ) : (
            <PlayIcon size={28} className="text-white" />
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: showControls ? 1 : 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)",
        }}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="progress-bar mb-3 pointer-events-auto"
          onClick={(e) => { e.stopPropagation(); seekTo(e); }}
        >
          <div
            className="progress-fill"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${accentColor}, #c05cfc)`,
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-white/70 text-xs font-medium tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button
            className="pointer-events-auto text-white/80 hover:text-white transition-colors p-1"
            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
          >
            {muted ? <VolumeMuteIcon size={18} /> : <VolumeIcon size={18} />}
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${accentColor} transparent transparent transparent` }}
          />
        </div>
      )}
    </div>
  );
}
