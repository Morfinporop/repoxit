import { useState, useEffect, useRef, useCallback } from "react";
import { fetchFeed, fetchVideo, VideoMeta } from "./api";
import { FeedItem } from "./components/FeedItem";
import { UploadModal } from "./components/UploadModal";
import { LogoIcon, UploadIcon, RefreshIcon } from "./components/Icons";

function useWindowSize() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w;
}

const SLUG_FROM_PATH = window.location.pathname.replace(/^\//, "") || null;

export default function App() {
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videosRef = useRef<VideoMeta[]>([]);
  const w = useWindowSize();
  const isWideScreen = w >= 768;

  videosRef.current = videos;

  // Setup intersection observer for scroll snap detection
  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index") ?? "0");
            setActiveIndex(index);
            const video = videosRef.current[index];
            if (video) {
              document.title = `${video.title} — Loope`;
              window.history.replaceState(null, "", `/${video.slug}`);
            }
          }
        });
      },
      { threshold: 0.6, root: feedRef.current }
    );

    itemRefs.current.forEach((el) => {
      if (el) observerRef.current?.observe(el);
    });
  }, []);

  // Load more videos from API
  const loadMore = useCallback(async (currentVideos: VideoMeta[]) => {
    setLoadingMore(true);
    try {
      const data = await fetchFeed(8, currentVideos.length);
      setVideos((prev) => {
        const existingSlugs = new Set(prev.map((v) => v.slug));
        const newOnes = data.videos.filter((v) => !existingSlugs.has(v.slug));
        return [...prev, ...newOnes];
      });
      setHasMore(data.hasMore);
    } catch {}
    setLoadingMore(false);
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError("");
      try {
        let startVideos: VideoMeta[] = [];

        if (SLUG_FROM_PATH) {
          try {
            const v = await fetchVideo(SLUG_FROM_PATH);
            startVideos = [v];
            document.title = `${v.title} — Loope`;
          } catch {}
        }

        const data = await fetchFeed(8, 0);
        const existingSlugs = new Set(startVideos.map((v) => v.slug));
        const rest = data.videos.filter((v) => !existingSlugs.has(v.slug));
        const combined = [...startVideos, ...rest];
        setVideos(combined);
        setHasMore(data.hasMore);
      } catch {
        setError("Failed to load. Check server connection.");
      }
      setLoading(false);
    };
    init();
  }, []);

  // Re-observe when videos change
  useEffect(() => {
    if (videos.length > 0) {
      // small delay to let DOM settle
      const t = setTimeout(setupObserver, 50);
      return () => clearTimeout(t);
    }
  }, [videos.length, setupObserver]);

  // Auto load more when near end
  useEffect(() => {
    if (activeIndex >= videos.length - 2 && hasMore && !loadingMore && !loading && videos.length > 0) {
      loadMore(videos);
    }
  }, [activeIndex, videos, hasMore, loadingMore, loading, loadMore]);

  const handleLiked = useCallback((slug: string, liked: boolean, likes: number) => {
    setVideos((prev) =>
      prev.map((v) => (v.slug === slug ? { ...v, is_liked: liked, likes } : v))
    );
  }, []);

  const handleUploaded = useCallback((video: VideoMeta) => {
    setVideos((prev) => [video, ...prev]);
    setActiveIndex(0);
    setTimeout(() => {
      feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  }, []);

  // Loading screen
  if (loading && videos.length === 0) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-black gap-6">
        <LogoIcon size={44} />
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{
            borderColor: "rgba(124,92,252,0.8)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  // Error screen
  if (error && videos.length === 0) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-black gap-6 px-8 text-center">
        <LogoIcon size={44} />
        <p className="text-white/40 text-sm leading-relaxed">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-white transition-all"
          style={{
            background: "rgba(124,92,252,0.25)",
            border: "1px solid rgba(124,92,252,0.35)",
          }}
        >
          <RefreshIcon size={15} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-dvh bg-black overflow-hidden">
      {/* Top navigation bar */}
      <nav
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 pt-safe-top"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 16px)",
          paddingBottom: "12px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <LogoIcon size={28} />
          <span
            className="font-bold text-base tracking-tight"
            style={{
              background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.55) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Loope
          </span>
        </div>

        {/* Upload button */}
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
          style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.11)",
          }}
        >
          <UploadIcon size={14} strokeWidth={2.2} />
          <span>Upload</span>
        </button>
      </nav>

      {/* Main feed */}
      {videos.length === 0 ? (
        <div className="h-dvh flex flex-col items-center justify-center gap-7 px-8 text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: "rgba(124,92,252,0.12)", border: "1px solid rgba(124,92,252,0.2)" }}
          >
            <UploadIcon size={32} className="text-purple-400" />
          </div>
          <div>
            <p className="text-white/80 font-semibold text-base">No videos yet</p>
            <p className="text-white/30 text-sm mt-2">Be the first to share something</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="px-8 py-3.5 rounded-2xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #7c5cfc, #c05cfc)" }}
          >
            Upload now
          </button>
        </div>
      ) : (
        <div ref={feedRef} className="feed-container">
          {videos.map((video, index) => (
            <div
              key={video.id}
              data-index={String(index)}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className="feed-item"
            >
              <FeedItem
                video={video}
                isActive={activeIndex === index}
                isWideScreen={isWideScreen}
                onLiked={handleLiked}
              />
            </div>
          ))}

          {/* Loading more spinner */}
          {loadingMore && (
            <div className="feed-item flex items-center justify-center bg-black">
              <div
                className="w-7 h-7 rounded-full border-2 animate-spin"
                style={{
                  borderColor: "rgba(124,92,252,0.5)",
                  borderTopColor: "transparent",
                }}
              />
            </div>
          )}

          {/* End of feed */}
          {!hasMore && videos.length > 2 && (
            <div className="feed-item flex flex-col items-center justify-center gap-5 bg-black">
              <LogoIcon size={38} />
              <p className="text-white/25 text-sm">You've seen everything</p>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <RefreshIcon size={14} /> Refresh
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onUploaded={handleUploaded} />
      )}
    </div>
  );
}
