import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchFeed, initUser, likeVideo, fetchComments, addComment,
  uploadVideo, fetchUserVideos, deleteVideo,
  VideoMeta, Comment, formatCount, timeAgo, getStreamUrl,
} from "./api";
import { useUserStore } from "./store";
import { VideoPlayer } from "./components/VideoPlayer";
import {
  PlusIcon, UserIcon, HeartIcon, HeartFillIcon, ChatIcon,
  ShareIcon, UpIcon, DownIcon, XIcon, SendIcon, MusicIcon,
  BackIcon, CopyIcon, CheckIcon, TrashIcon, GridIcon,
} from "./components/Icons";
import {
  glass, glassDark, gradientAccent, actionBtn, navBtn,
  overlay, modal, sheet, input,
} from "./styles";

/* ─── Helpers ─── */
const S = (s: React.CSSProperties) => s;

/* ─── Main App ─── */
export default function App() {
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { user, setUser } = useUserStore();

  const [view, setView] = useState<"feed" | "upload" | "comments" | "share" | "profile">("feed");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileVideos, setProfileVideos] = useState<VideoMeta[]>([]);

  const feedRef = useRef<HTMLDivElement>(null);
  const isWide = useIsWide();

  /* init */
  useEffect(() => {
    (async () => {
      try {
        const u = await initUser();
        setUser(u);
        const d = await fetchFeed(10, 0);
        setVideos(d.videos);
        setHasMore(d.hasMore);
      } catch (e) { console.error(e); }
      setReady(true);
    })();
  }, [setUser]);

  /* keyboard nav */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (view !== "feed") return;
      if (e.key === "ArrowUp") { e.preventDefault(); go(idx - 1); }
      if (e.key === "ArrowDown") { e.preventDefault(); go(idx + 1); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [idx, videos.length, view]);

  const go = useCallback((i: number) => {
    const n = Math.max(0, Math.min(videos.length - 1, i));
    setIdx(n);
    feedRef.current?.scrollTo({ top: n * window.innerHeight, behavior: "smooth" });
  }, [videos.length]);

  /* scroll detection */
  const onScroll = useCallback(() => {
    const el = feedRef.current;
    if (!el) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    setIdx(i);
    /* load more near end */
    if (i >= videos.length - 2 && hasMore) {
      fetchFeed(10, videos.length).then(d => {
        setVideos(p => [...p, ...d.videos.filter(v => !p.some(x => x.id === v.id))]);
        setHasMore(d.hasMore);
      });
    }
  }, [videos, hasMore]);

  /* url update */
  useEffect(() => {
    const v = videos[idx];
    if (v) {
      document.title = `${v.title} — Loope`;
      window.history.replaceState(null, "", `/${v.slug}`);
    }
  }, [idx, videos]);

  /* like */
  const handleLike = useCallback(async (slug: string) => {
    const r = await likeVideo(slug);
    setVideos(p => p.map(v => v.slug === slug ? { ...v, is_liked: r.liked, likes: r.likes } : v));
  }, []);

  /* uploaded */
  const onUploaded = useCallback((v: VideoMeta) => {
    setVideos(p => [v, ...p]);
    setIdx(0);
    setView("feed");
    setTimeout(() => feedRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }, []);

  /* open profile */
  const openProfile = useCallback((uid: string) => {
    setProfileUserId(uid);
    setView("profile");
    fetchUserVideos(uid).then(setProfileVideos).catch(() => {});
  }, []);

  /* delete */
  const handleDelete = useCallback(async (slug: string) => {
    await deleteVideo(slug);
    setVideos(p => p.filter(v => v.slug !== slug));
    setProfileVideos(p => p.filter(v => v.slug !== slug));
  }, []);

  if (!ready) return <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7" }}>
    <div style={{ width: 32, height: 32, border: "3px solid #ddd", borderTopColor: "#a78bfa", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
  </div>;

  const cur = videos[idx];

  return (
    <div style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#f5f5f7" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ─── TOP CENTER: two glass buttons ─── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", justifyContent: "center", paddingTop: "max(env(safe-area-inset-top, 12px), 12px)", gap: 10, pointerEvents: "none" }}>
        <button onClick={() => setView("upload")} style={{ ...navBtn, pointerEvents: "auto" }}>
          <PlusIcon size={20} />
        </button>
        <button onClick={() => openProfile(user?.id ?? "")} style={{ ...navBtn, pointerEvents: "auto" }}>
          <UserIcon size={20} />
        </button>
      </div>

      {/* ─── FEED ─── */}
      {videos.length === 0 ? (
        <div style={{ height: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <div style={{ ...gradientAccent, width: 72, height: 72, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PlusIcon size={32} style={{ color: "#fff" }} />
          </div>
          <p style={{ color: "#888", fontSize: 15 }}>No videos yet</p>
          <button onClick={() => setView("upload")} style={{ ...gradientAccent, color: "#fff", padding: "12px 28px", borderRadius: 14, fontSize: 14, fontWeight: 600, border: "none" }}>
            Upload first video
          </button>
        </div>
      ) : (
        <div
          ref={feedRef}
          onScroll={onScroll}
          style={{ height: "100dvh", overflowY: "scroll", scrollSnapType: "y mandatory", scrollbarWidth: "none" }}
        >
          {videos.map((v, i) => (
            <div key={v.id} style={{ height: "100dvh", scrollSnapAlign: "start", scrollSnapStop: "always", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", background: "#000" }}>

              {/* ambient glow for wide */}
              {isWide && (
                <>
                  <div style={{ position: "absolute", left: -60, top: "25%", width: 140, height: "50%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(167,139,250,0.2), transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", right: -60, top: "25%", width: 140, height: "50%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(244,114,182,0.2), transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
                </>
              )}

              {/* video container */}
              <div style={{ position: "relative", width: isWide ? "min(400px, 56.25vh)" : "100%", height: "100%", overflow: "hidden" }}>
                {isWide && <>
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 1, background: "linear-gradient(to bottom, transparent, rgba(167,139,250,0.2), transparent)", zIndex: 5, pointerEvents: "none" }} />
                  <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 1, background: "linear-gradient(to bottom, transparent, rgba(244,114,182,0.2), transparent)", zIndex: 5, pointerEvents: "none" }} />
                </>}

                <VideoPlayer slug={v.slug} fileType={v.file_type} hasAudio={!!v.audio_title} isActive={idx === i} />

                {/* audio badge */}
                {v.audio_title && (
                  <div style={{ position: "absolute", top: 68, right: 12, zIndex: 10, ...glassDark, borderRadius: 20, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                    <MusicIcon size={12} style={{ color: "#fff" }} />
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.audio_title}</span>
                  </div>
                )}

                {/* bottom info */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 16px 80px", pointerEvents: "none", background: "linear-gradient(to top, rgba(0,0,0,0.45), transparent)" }}>
                  <p style={{ color: "#fff", fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{v.title}</p>
                  {v.description && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{v.description}</p>}
                  <button
                    onClick={() => openProfile(v.user_id)}
                    style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, color: "rgba(255,255,255,0.5)", fontSize: 12, background: "none", border: "none", pointerEvents: "auto", cursor: "pointer" }}
                  >
                    <UserIcon size={12} style={{ color: "rgba(255,255,255,0.5)" }} />
                    {v.user_nickname} · {timeAgo(v.created_at)}
                  </button>
                </div>

                {/* right action column */}
                <div style={{ position: "absolute", right: 12, bottom: 90, zIndex: 20, display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                  <ActionBtn icon={v.is_liked ? <HeartFillIcon size={22} style={{ color: "#f472b6" }} /> : <HeartIcon size={22} style={{ color: "#fff" }} />} label={formatCount(v.likes)} onClick={() => handleLike(v.slug)} />
                  <ActionBtn icon={<ChatIcon size={22} style={{ color: "#fff" }} />} label={formatCount(Number(v.comment_count))} onClick={() => setView("comments")} />
                  <ActionBtn icon={<ShareIcon size={22} style={{ color: "#fff" }} />} label="Share" onClick={() => setView("share")} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── DESKTOP NAV ARROWS ─── */}
      {isWide && videos.length > 0 && (
        <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", zIndex: 40, display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={() => go(idx - 1)} disabled={idx === 0} style={{ ...navBtn, opacity: idx === 0 ? 0.3 : 1 }}>
            <UpIcon size={22} />
          </button>
          <button onClick={() => go(idx + 1)} disabled={idx >= videos.length - 1} style={{ ...navBtn, opacity: idx >= videos.length - 1 ? 0.3 : 1 }}>
            <DownIcon size={22} />
          </button>
        </div>
      )}

      {/* ─── MODALS ─── */}
      {view === "upload" && <UploadModal onClose={() => setView("feed")} onDone={onUploaded} />}
      {view === "comments" && cur && <CommentsSheet slug={cur.slug} onClose={() => setView("feed")} />}
      {view === "share" && cur && <ShareSheet slug={cur.slug} title={cur.title} onClose={() => setView("feed")} />}
      {view === "profile" && profileUserId && (
        <ProfileModal
          userId={profileUserId}
          videos={profileVideos}
          isOwn={profileUserId === user?.id}
          nickname={profileUserId === user?.id ? (user?.nickname ?? "") : (profileVideos[0]?.user_nickname ?? "Anonymous")}
          onClose={() => setView("feed")}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

/* ─── Action button (video overlay) ─── */
function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer" }}>
      <div style={actionBtn}>{icon}</div>
      <span style={{ color: "#fff", fontSize: 11, fontWeight: 500 }}>{label}</span>
    </button>
  );
}

/* ─── Upload Modal ─── */
function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: (v: VideoMeta) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [audio, setAudio] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [prog, setProg] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fRef = useRef<HTMLInputElement>(null);
  const aRef = useRef<HTMLInputElement>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    setFiles(list);
    if (!title && list[0]) setTitle(list[0].name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
  };

  const submit = async () => {
    if (!files.length || !title.trim() || busy) return;
    setBusy(true); setErr("");
    try {
      const v = await uploadVideo(files, title.trim(), desc.trim(), audio ?? undefined, setProg);
      onDone(v);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
      setBusy(false); setProg(0);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, animation: "fadeIn 0.25s ease" }} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px" }}>
          <span style={{ fontWeight: 600, fontSize: 17, color: "#1d1d1f" }}>Upload</span>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.04)" }}>
            <XIcon size={16} style={{ color: "#888" }} />
          </button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* file pick */}
          {files.length === 0 ? (
            <div
              onClick={() => fRef.current?.click()}
              style={{ border: "2px dashed rgba(0,0,0,0.08)", borderRadius: 16, padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, cursor: "pointer", background: "rgba(0,0,0,0.01)" }}
            >
              <div style={{ ...gradientAccent, width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PlusIcon size={24} style={{ color: "#fff" }} />
              </div>
              <p style={{ color: "#666", fontSize: 13 }}>Video, images (max 200MB)</p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {files.map((f, i) => (
                <div key={i} style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", background: "#eee", position: "relative" }}>
                  {f.type.startsWith("video/") ? (
                    <video src={URL.createObjectURL(f)} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                  ) : (
                    <img src={URL.createObjectURL(f)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                  )}
                </div>
              ))}
              <button onClick={() => { setFiles([]); fRef.current?.click(); }} style={{ width: 72, height: 72, borderRadius: 12, border: "1px dashed rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PlusIcon size={18} style={{ color: "#aaa" }} />
              </button>
            </div>
          )}

          <input ref={fRef} type="file" accept="video/*,image/*" multiple hidden onChange={pick} />

          {/* audio pick */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => aRef.current?.click()} style={{ ...S(glass), borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#555" }}>
              <MusicIcon size={16} style={{ color: "#a78bfa" }} />
              {audio ? audio.name.substring(0, 20) : "Add audio"}
            </button>
            {audio && <button onClick={() => setAudio(null)} style={{ color: "#ccc", fontSize: 12 }}><XIcon size={14} /></button>}
          </div>
          <input ref={aRef} type="file" accept="audio/*" hidden onChange={e => e.target.files?.[0] && setAudio(e.target.files[0])} />

          {/* title */}
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" maxLength={200} style={input} />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" maxLength={1000} rows={2} style={{ ...input, resize: "none" }} />

          {err && <p style={{ color: "#e11d48", fontSize: 13 }}>{err}</p>}
        </div>

        {/* footer */}
        <div style={{ padding: "12px 20px 20px" }}>
          {busy ? (
            <div>
              <div style={{ height: 4, background: "rgba(0,0,0,0.05)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${prog}%`, background: "linear-gradient(90deg, #a78bfa, #f472b6)", borderRadius: 2, transition: "width 0.15s" }} />
              </div>
              <p style={{ textAlign: "center", color: "#aaa", fontSize: 13, marginTop: 8 }}>{prog}%</p>
            </div>
          ) : (
            <button onClick={submit} disabled={!files.length || !title.trim()} style={{ width: "100%", padding: "14px 0", borderRadius: 14, ...gradientAccent, color: "#fff", fontWeight: 600, fontSize: 15, border: "none", opacity: !files.length || !title.trim() ? 0.4 : 1, cursor: "pointer" }}>
              Publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Comments Sheet ─── */
function CommentsSheet({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchComments(slug).then(setComments).catch(() => {}); }, [slug]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const c = await addComment(slug, text.trim());
      setComments(p => [c, ...p]);
      setText("");
    } catch {}
    setSending(false);
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 99, background: "rgba(0,0,0,0.2)" }} onClick={onClose} />
      <div style={{ ...sheet, animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)", zIndex: 100 }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <span style={{ fontWeight: 600, fontSize: 16, color: "#1d1d1f" }}>{comments.length} comments</span>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.04)" }}>
            <XIcon size={16} style={{ color: "#888" }} />
          </button>
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
          {comments.length === 0 ? (
            <p style={{ textAlign: "center", color: "#bbb", fontSize: 14, padding: "40px 0" }}>No comments yet</p>
          ) : comments.map(c => (
            <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 16, animation: "fadeIn 0.2s ease" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `hsl(${(c.user_nickname.charCodeAt(10) || 0) * 47 % 360}, 55%, 65%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontSize: 12, fontWeight: 600 }}>
                {c.user_nickname.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{c.user_nickname}</span>
                  <span style={{ fontSize: 11, color: "#bbb" }}>{timeAgo(c.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: "#555", marginTop: 3, lineHeight: 1.45 }}>{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* input */}
        <div style={{ padding: "10px 16px 20px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 8 }}>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..." maxLength={500}
            onKeyDown={e => e.key === "Enter" && send()}
            style={{ ...input, flex: 1 }} />
          <button onClick={send} disabled={!text.trim()} style={{ ...gradientAccent, width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "none", opacity: text.trim() ? 1 : 0.4 }}>
            <SendIcon size={18} style={{ color: "#fff" }} />
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Share Sheet ─── */
function ShareSheet({ slug, title, onClose }: { slug: string; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/${slug}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 99, background: "rgba(0,0,0,0.2)" }} onClick={onClose} />
      <div style={{ ...sheet, animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px" }}>
          <span style={{ fontWeight: 600, fontSize: 16, color: "#1d1d1f" }}>Share</span>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.04)" }}>
            <XIcon size={16} style={{ color: "#888" }} />
          </button>
        </div>
        <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: "#888", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
          <div style={{ ...S(glass), borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13, color: "#555", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
          </div>
          <button onClick={copy} style={{ width: "100%", padding: "14px 0", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, ...(copied ? { background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" } : { ...gradientAccent, color: "#fff", border: "none" }), fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            {copied ? <><CheckIcon size={16} /> Copied</> : <><CopyIcon size={16} /> Copy link</>}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Profile Modal ─── */
function ProfileModal({ videos, isOwn, nickname, onClose, onDelete }: {
  userId?: string; videos: VideoMeta[]; isOwn: boolean; nickname: string; onClose: () => void; onDelete: (slug: string) => void;
}) {
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 500, maxHeight: "85dvh", animation: "fadeIn 0.25s ease" }} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 20px 16px" }}>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.04)" }}>
            <BackIcon size={16} style={{ color: "#666" }} />
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: 16, color: "#1d1d1f" }}>{nickname}</p>
            <p style={{ fontSize: 12, color: "#aaa" }}>{videos.length} videos</p>
          </div>
        </div>

        {/* grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 20px" }}>
          {videos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb" }}>
              <GridIcon size={32} style={{ color: "#ddd", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14 }}>No videos</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {videos.map(v => (
                <div key={v.id} style={{ position: "relative", aspectRatio: "9/16", borderRadius: 10, overflow: "hidden", background: "#000" }}>
                  <video src={getStreamUrl(v.slug)} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted preload="metadata" />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 6px 6px", background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <span style={{ color: "#fff", fontSize: 10 }}>{formatCount(v.views)} views</span>
                    {isOwn && (
                      <button onClick={() => { if (confirm("Delete?")) onDelete(v.slug); }} style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}>
                        <TrashIcon size={12} style={{ color: "#f87171" }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Hook ─── */
function useIsWide() {
  const [w, setW] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const h = () => setW(window.innerWidth >= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}
