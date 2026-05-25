import { useState, useCallback } from "react";
import { VideoMeta, likeVideo, formatCount, timeAgo } from "../api";
import { VideoPlayer } from "./VideoPlayer";
import { AmbientGlow } from "./AmbientGlow";
import { CommentsPanel } from "./CommentsPanel";
import { ShareModal } from "./ShareModal";
import {
  HeartIcon,
  HeartFilledIcon,
  CommentIcon,
  ShareIcon,
  EyeIcon,
} from "./Icons";

interface FeedItemProps {
  video: VideoMeta;
  isActive: boolean;
  isWideScreen: boolean;
  onLiked: (slug: string, liked: boolean, likes: number) => void;
}

export function FeedItem({ video, isActive, isWideScreen, onLiked }: FeedItemProps) {
  const [liked, setLiked] = useState(video.is_liked);
  const [likes, setLikes] = useState(video.likes);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

  const handleLike = useCallback(async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikes((prev) => prev + (newLiked ? 1 : -1));
    if (newLiked) {
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 400);
    }
    try {
      const result = await likeVideo(video.slug);
      setLiked(result.liked);
      setLikes(result.likes);
      onLiked(video.slug, result.liked, result.likes);
    } catch {
      setLiked(!newLiked);
      setLikes((prev) => prev + (!newLiked ? 1 : -1));
    }
  }, [liked, video.slug, onLiked]);

  const handleDoubleTap = useCallback(() => {
    if (!liked) handleLike();
  }, [liked, handleLike]);

  return (
    <div className="feed-item relative flex items-center justify-center bg-black">
      {/* Ambient glow for wide screens */}
      {isWideScreen && (
        <AmbientGlow color="#7c5cfc" intensity={0.45} />
      )}

      {/* Video container — centered, portrait aspect */}
      <div
        className="relative overflow-hidden"
        style={{
          width: isWideScreen ? "calc(100vh * 9/16)" : "100%",
          maxWidth: isWideScreen ? "420px" : "100%",
          height: "100%",
        }}
      >
        {/* Edge glow for wide screens */}
        {isWideScreen && (
          <>
            <div
              className="absolute inset-y-0 left-0 w-px pointer-events-none z-10"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(124,92,252,0.25), transparent)" }}
            />
            <div
              className="absolute inset-y-0 right-0 w-px pointer-events-none z-10"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(192,92,252,0.25), transparent)" }}
            />
          </>
        )}

        {/* Player */}
        <div
          className="absolute inset-0"
          onDoubleClick={handleDoubleTap}
        >
          <VideoPlayer
            slug={video.slug}
            fileType={video.file_type}
            isActive={isActive}
          />
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 pointer-events-none">
          <div className="mb-2">
            <h2 className="text-white font-semibold text-sm leading-tight line-clamp-2 drop-shadow">
              {video.title}
            </h2>
            {video.description && (
              <p className="text-white/55 text-xs mt-1 line-clamp-2 leading-relaxed">
                {video.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-white/35 text-xs">
                <EyeIcon size={11} strokeWidth={1.5} />
                <span>{formatCount(video.views)}</span>
              </div>
              <span className="text-white/20 text-xs">{timeAgo(video.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Right action buttons */}
        <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-5">
          {/* Like */}
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all"
              style={{
                background: liked ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.07)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: liked ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(255,255,255,0.09)",
              }}
            >
              {liked ? (
                <HeartFilledIcon
                  size={22}
                  className={`text-red-400 ${likeAnim ? "animate-heart" : ""}`}
                />
              ) : (
                <HeartIcon size={22} className="text-white/80 group-hover:text-white transition-colors" />
              )}
            </div>
            <span className="text-white/60 text-xs font-medium tabular-nums">
              {formatCount(likes)}
            </span>
          </button>

          {/* Comment */}
          <button
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all"
              style={{
                background: "rgba(255,255,255,0.07)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <CommentIcon size={20} className="text-white/80 group-hover:text-white transition-colors" />
            </div>
            <span className="text-white/60 text-xs font-medium tabular-nums">
              {formatCount(Number(video.comment_count))}
            </span>
          </button>

          {/* Share */}
          <button
            onClick={() => setShowShare(true)}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all"
              style={{
                background: "rgba(255,255,255,0.07)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <ShareIcon size={20} className="text-white/80 group-hover:text-white transition-colors" />
            </div>
            <span className="text-white/60 text-xs font-medium">
              Share
            </span>
          </button>
        </div>

        {/* Comments panel */}
        {showComments && (
          <CommentsPanel
            slug={video.slug}
            onClose={() => setShowComments(false)}
          />
        )}

        {/* Share modal */}
        {showShare && (
          <ShareModal
            slug={video.slug}
            title={video.title}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>

      {/* Wide screen decorative lines */}
      {isWideScreen && (
        <>
          {/* Left */}
          <div
            className="absolute left-0 top-0 bottom-0 flex items-center justify-center pointer-events-none"
            style={{ width: "calc((100% - min(420px, 56.25vh)) / 2)" }}
          >
            <div className="w-px h-32 rounded-full opacity-15" style={{ background: "linear-gradient(to bottom, transparent, #7c5cfc, transparent)" }} />
          </div>
          {/* Right */}
          <div
            className="absolute right-0 top-0 bottom-0 flex items-center justify-center pointer-events-none"
            style={{ width: "calc((100% - min(420px, 56.25vh)) / 2)" }}
          >
            <div className="w-px h-32 rounded-full opacity-15" style={{ background: "linear-gradient(to bottom, transparent, #c05cfc, transparent)" }} />
          </div>
        </>
      )}
    </div>
  );
}
