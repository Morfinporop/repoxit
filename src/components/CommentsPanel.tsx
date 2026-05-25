import { useState, useEffect, useRef } from "react";
import { fetchComments, addComment, Comment, timeAgo } from "../api";
import { CloseIcon, SendIcon } from "./Icons";

interface CommentsPanelProps {
  slug: string;
  onClose: () => void;
}

export function CommentsPanel({ slug, onClose }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(() => localStorage.getItem("loope_author") || "");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchComments(slug)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const name = author.trim() || "Anonymous";
    localStorage.setItem("loope_author", name);
    try {
      const comment = await addComment(slug, text.trim(), name);
      setComments((prev) => [comment, ...prev]);
      setText("");
    } catch {}
    setSending(false);
  };

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col"
      style={{
        background: "rgba(4,4,10,0.92)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8">
        <div>
          <h3 className="text-white font-semibold text-base">Comments</h3>
          <p className="text-white/40 text-xs mt-0.5">{comments.length} comments</p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/8 transition-all"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      {/* Comments list */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 rounded shimmer" />
                  <div className="h-3 w-full rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm">Be the first to comment</p>
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3 animate-fade-in">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                style={{
                  background: `hsl(${(c.author.charCodeAt(0) * 47) % 360}, 60%, 40%)`,
                }}
              >
                {c.author.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-white/90 text-sm font-medium">{c.author}</span>
                  <span className="text-white/30 text-xs">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-white/70 text-sm mt-1 leading-relaxed break-words">{c.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-3 border-t border-white/8">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name (optional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full px-4 py-2 rounded-xl mb-2 text-sm text-white/80 placeholder:text-white/25 outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Write a comment..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
              style={{
                background: "linear-gradient(135deg, #7c5cfc, #c05cfc)",
              }}
            >
              <SendIcon size={18} className="text-white" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
