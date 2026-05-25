import { useState } from "react";
import { CloseIcon, LinkIcon, CheckIcon } from "./Icons";

interface ShareModalProps {
  slug: string;
  title: string;
  onClose: () => void;
}

export function ShareModal({ slug, title, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/${slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {}
    } else {
      copy();
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl p-6 animate-slide-up"
        style={{
          background: "rgba(12,12,18,0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold text-base">Share</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/8 transition-all"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Title */}
        <p className="text-white/40 text-sm mb-4 truncate">{title}</p>

        {/* URL display */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <LinkIcon size={16} className="text-white/40 flex-shrink-0" />
          <span className="text-white/60 text-sm flex-1 truncate font-mono">{url}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={copy}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium transition-all"
            style={{
              background: copied
                ? "rgba(34,197,94,0.15)"
                : "rgba(255,255,255,0.07)",
              border: copied
                ? "1px solid rgba(34,197,94,0.3)"
                : "1px solid rgba(255,255,255,0.1)",
              color: copied ? "rgb(74,222,128)" : "rgba(255,255,255,0.8)",
            }}
          >
            {copied ? <CheckIcon size={16} /> : <LinkIcon size={16} />}
            {copied ? "Copied" : "Copy link"}
          </button>

          {typeof navigator.share === 'function' && (
            <button
              onClick={share}
              className="flex-1 py-3.5 rounded-2xl text-sm font-medium text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #7c5cfc, #c05cfc)",
              }}
            >
              Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
