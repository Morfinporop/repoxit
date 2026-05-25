import { useState, useRef, useCallback } from "react";
import { uploadVideo, VideoMeta } from "../api";
import { CloseIcon, UploadIcon, VideoIcon, ImageIcon } from "./Icons";

interface UploadModalProps {
  onClose: () => void;
  onUploaded: (video: VideoMeta) => void;
}

function extractThumbnail(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) return resolve(undefined);
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.currentTime = 0.5;
    video.onloadeddata = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 854;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(undefined);
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const aspect = vw / vh;
      const canvasAspect = canvas.width / canvas.height;
      let sx = 0, sy = 0, sw = vw, sh = vh;
      if (aspect > canvasAspect) {
        sw = vh * canvasAspect;
        sx = (vw - sw) / 2;
      } else {
        sh = vw / canvasAspect;
        sy = (vh - sh) / 2;
      }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(undefined); };
  });
}

export function UploadModal({ onClose, onUploaded }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<string | undefined>(undefined);

  const handleFile = useCallback(async (f: File) => {
    const maxSize = 200 * 1024 * 1024;
    if (f.size > maxSize) {
      setError("File too large. Max 200MB.");
      return;
    }
    setFile(f);
    setError("");
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));

    const objUrl = URL.createObjectURL(f);
    setPreview(objUrl);
    thumbnailRef.current = await extractThumbnail(f);
  }, [title]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    setError("");
    try {
      const result = await uploadVideo(
        file,
        title.trim(),
        description.trim(),
        thumbnailRef.current,
        setProgress
      );
      onUploaded(result);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
      setProgress(0);
    }
  };

  const isVideo = file?.type.startsWith("video/");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90dvh] flex flex-col rounded-3xl overflow-hidden animate-scale-in"
        style={{
          background: "rgba(8,8,20,0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 flex-shrink-0">
          <h2 className="text-white font-semibold text-lg">Upload</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-all"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Drop zone */}
          {!file ? (
            <div
              className="relative rounded-2xl flex flex-col items-center justify-center gap-4 py-14 cursor-pointer transition-all"
              style={{
                border: `2px dashed ${dragging ? "rgba(124,92,252,0.6)" : "rgba(255,255,255,0.1)"}`,
                background: dragging ? "rgba(124,92,252,0.06)" : "rgba(255,255,255,0.02)",
              }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(124,92,252,0.15)" }}
              >
                <UploadIcon size={28} className="text-purple-400" />
              </div>
              <div className="text-center">
                <p className="text-white/80 font-medium text-sm">Drop your file here</p>
                <p className="text-white/35 text-xs mt-1">MP4, WebM, MOV, JPG, PNG, GIF</p>
                <p className="text-white/25 text-xs mt-0.5">Max 200MB · Video max 1 min</p>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5 text-white/30 text-xs">
                  <VideoIcon size={12} /> Video
                </div>
                <div className="flex items-center gap-1.5 text-white/30 text-xs">
                  <ImageIcon size={12} /> Image
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/mov,video/quicktime,image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "9/16", maxHeight: "240px" }}>
              {isVideo ? (
                <video
                  src={preview ?? undefined}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              ) : (
                <img src={preview ?? undefined} className="w-full h-full object-cover" alt="" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <button
                onClick={() => { setFile(null); setPreview(null); setTitle(""); }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white bg-black/50"
                style={{ backdropFilter: "blur(8px)" }}
              >
                <CloseIcon size={14} />
              </button>
              <div className="absolute bottom-3 left-3">
                <span className="text-white/60 text-xs">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1.5 block">Title</label>
              <input
                type="text"
                placeholder="Give your video a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,92,252,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
            <div>
              <label className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1.5 block">Description</label>
              <textarea
                placeholder="Optional description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={2}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 outline-none resize-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,92,252,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm text-red-400" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-white/6 flex-shrink-0">
          {uploading ? (
            <div className="space-y-3">
              <div className="progress-bar h-1.5">
                <div
                  className="progress-fill h-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-white/40 text-sm">
                Uploading {progress}%
              </p>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!file || !title.trim()}
              className="w-full py-4 rounded-2xl text-white font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #7c5cfc, #c05cfc)",
              }}
            >
              Publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
