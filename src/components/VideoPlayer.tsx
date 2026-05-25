import { useRef, useState, useEffect, useCallback } from "react";
import { getStreamUrl, getAudioUrl, formatTime } from "../api";
import { PlayIcon, PauseIcon, VolIcon, MuteIcon } from "./Icons";
import { glassDark, progressTrack, progressFill, volTrack, volFill } from "../styles";

interface Props {
  slug: string;
  fileType?: string | null;
  hasAudio?: boolean;
  isActive: boolean;
}

export function VideoPlayer({ slug, fileType, hasAudio, isActive }: Props) {
  const vRef = useRef<HTMLVideoElement>(null);
  const aRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const volRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(0.7);
  const [prog, setProg] = useState(0);
  const [dur, setDur] = useState(0);
  const [cur, setCur] = useState(0);
  const [showCtrl, setShowCtrl] = useState(false);
  const [showVol, setShowVol] = useState(false);

  const isVideo = fileType?.startsWith("video/");
  const url = isVideo ? getStreamUrl(slug) : null;
  const audioUrl = hasAudio ? getAudioUrl(slug) : null;

  useEffect(() => {
    const v = vRef.current;
    const a = aRef.current;
    if (!v || !isActive) {
      if (v) { v.pause(); v.currentTime = 0; }
      if (a) { a.pause(); a.currentTime = 0; }
      setPlaying(false); setProg(0); setCur(0);
      return;
    }
    v.muted = muted;
    v.volume = vol;
    const p = v.play();
    if (p) p.then(() => { setPlaying(true); if (a && hasAudio) a.play(); }).catch(() => {});
  }, [isActive]);

  useEffect(() => {
    const v = vRef.current; const a = aRef.current;
    if (v) { v.muted = muted; v.volume = vol; }
    if (a) { a.muted = muted; a.volume = vol; }
  }, [muted, vol]);

  const toggle = useCallback(() => {
    const v = vRef.current; const a = aRef.current;
    if (!v) return;
    if (v.paused) { v.play(); if (a) a.play(); setPlaying(true); }
    else { v.pause(); if (a) a.pause(); setPlaying(false); }
    brief();
  }, []);

  const brief = () => { setShowCtrl(true); setTimeout(() => setShowCtrl(false), 2200); };

  const onTime = () => { const v = vRef.current; if (!v) return; setCur(v.currentTime); if (v.duration) setProg((v.currentTime / v.duration) * 100); };
  const onMeta = () => { const v = vRef.current; if (v) setDur(v.duration); };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = vRef.current; const a = aRef.current; const b = barRef.current;
    if (!v || !b) return;
    const r = b.getBoundingClientRect();
    const t = ((e.clientX - r.left) / r.width) * v.duration;
    v.currentTime = t;
    if (a) a.currentTime = t;
  };

  const changeVol = (e: React.MouseEvent<HTMLDivElement>) => {
    const b = volRef.current; if (!b) return;
    const r = b.getBoundingClientRect();
    const nv = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
    setVol(nv);
    if (nv === 0) setMuted(true);
    else if (muted) setMuted(false);
  };

  if (!isVideo) return null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#000", overflow: "hidden" }}>
      <video
        ref={vRef} src={url ?? undefined}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        loop playsInline muted={muted}
        preload={isActive ? "auto" : "metadata"}
        onTimeUpdate={onTime} onLoadedMetadata={onMeta}
        onClick={toggle}
      />

      {hasAudio && audioUrl && <audio ref={aRef} src={audioUrl} loop preload={isActive ? "auto" : "none"} />}

      {/* bottom gradient */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent 40%)", pointerEvents: "none" }} />

      {/* center play/pause */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", opacity: showCtrl ? 1 : 0, transition: "opacity 0.25s" }}>
        <div style={{ ...glassDark, borderRadius: "50%", width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {playing ? <PauseIcon size={28} style={{ color: "#fff" }} /> : <PlayIcon size={28} style={{ color: "#fff" }} />}
        </div>
      </div>

      {/* volume bar — YouTube Shorts style, top-left on hover */}
      <div
        style={{ position: "absolute", left: 12, top: 60, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
        onMouseEnter={() => setShowVol(true)}
        onMouseLeave={() => setShowVol(false)}
      >
        <button
          onClick={() => setMuted(!muted)}
          style={{ ...glassDark, borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", border: "none" }}
        >
          {muted || vol === 0 ? <MuteIcon size={16} /> : <VolIcon size={16} />}
        </button>

        {showVol && (
          <div ref={volRef} onClick={changeVol} style={{ ...volTrack, animation: "fadeIn 0.15s ease" }}>
            <div style={{ ...volFill, height: `${vol * 100}%` }} />
          </div>
        )}
      </div>

      {/* progress & time */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 16px 12px", pointerEvents: "none", opacity: showCtrl ? 1 : 0, transition: "opacity 0.25s" }}>
        <div ref={barRef} onClick={(e) => { e.stopPropagation(); seek(e); }} style={{ ...progressTrack, pointerEvents: "auto" }}>
          <div style={{ ...progressFill, width: `${prog}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>
          <span>{formatTime(cur)}</span>
          <span>{formatTime(dur)}</span>
        </div>
      </div>
    </div>
  );
}
