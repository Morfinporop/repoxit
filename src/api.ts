const BASE = import.meta.env.PROD ? "" : "http://localhost:3001";

export interface VideoMeta {
  id: string;
  slug: string;
  title: string;
  description: string;
  file_type: string;
  file_size: number;
  duration: number;
  views: number;
  likes: number;
  created_at: string;
  comment_count: number;
  is_liked: boolean;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  created_at: string;
}

export interface FeedResponse {
  videos: VideoMeta[];
  total: number;
  hasMore: boolean;
}

function getSessionId(): string {
  let id = localStorage.getItem("loope_session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("loope_session", id);
  }
  return id;
}

export const sessionId = getSessionId();

export async function fetchFeed(limit = 10, offset = 0): Promise<FeedResponse> {
  const r = await fetch(
    `${BASE}/api/videos?limit=${limit}&offset=${offset}&sessionId=${sessionId}`
  );
  if (!r.ok) throw new Error("Failed to fetch feed");
  return r.json();
}

export async function fetchVideo(slug: string): Promise<VideoMeta> {
  const r = await fetch(`${BASE}/api/videos/${slug}?sessionId=${sessionId}`);
  if (!r.ok) throw new Error("Not found");
  return r.json();
}

export function getStreamUrl(slug: string): string {
  return `${BASE}/api/videos/${slug}/stream`;
}

export function getThumbnailUrl(slug: string): string {
  return `${BASE}/api/videos/${slug}/thumbnail`;
}

export async function likeVideo(
  slug: string
): Promise<{ liked: boolean; likes: number }> {
  const r = await fetch(`${BASE}/api/videos/${slug}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!r.ok) throw new Error("Failed to like");
  return r.json();
}

export async function fetchComments(slug: string): Promise<Comment[]> {
  const r = await fetch(`${BASE}/api/videos/${slug}/comments`);
  if (!r.ok) throw new Error("Failed to fetch comments");
  return r.json();
}

export async function addComment(
  slug: string,
  text: string,
  author = "Anonymous"
): Promise<Comment> {
  const r = await fetch(`${BASE}/api/videos/${slug}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, author }),
  });
  if (!r.ok) throw new Error("Failed to post comment");
  return r.json();
}

export async function uploadVideo(
  file: File,
  title: string,
  description: string,
  thumbnail?: string,
  onProgress?: (p: number) => void
): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("description", description);
    if (thumbnail) formData.append("thumbnail", thumbnail);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/api/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.responseText || "Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
