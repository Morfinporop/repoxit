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
  user_id: string;
  user_nickname: string;
  media_urls?: string[];
  audio_url?: string;
  audio_title?: string;
}

export interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_nickname: string;
}

export interface User {
  id: string;
  nickname: string;
}

export interface FeedResponse {
  videos: VideoMeta[];
  total: number;
  hasMore: boolean;
}

function getUserId(): string {
  let id = localStorage.getItem("loope_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("loope_user_id", id);
  }
  return id;
}

export const userId = getUserId();

export async function initUser(): Promise<User> {
  const r = await fetch(`${BASE}/api/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!r.ok) throw new Error("Failed to init user");
  return r.json();
}

export async function fetchFeed(limit = 10, offset = 0): Promise<FeedResponse> {
  const r = await fetch(
    `${BASE}/api/videos?limit=${limit}&offset=${offset}&userId=${userId}`
  );
  if (!r.ok) throw new Error("Failed to fetch feed");
  return r.json();
}

export async function fetchUserVideos(targetUserId: string): Promise<VideoMeta[]> {
  const r = await fetch(`${BASE}/api/users/${targetUserId}/videos?userId=${userId}`);
  if (!r.ok) throw new Error("Failed to fetch user videos");
  return r.json();
}

export async function fetchVideo(slug: string): Promise<VideoMeta> {
  const r = await fetch(`${BASE}/api/videos/${slug}?userId=${userId}`);
  if (!r.ok) throw new Error("Not found");
  return r.json();
}

export function getStreamUrl(slug: string): string {
  return `${BASE}/api/videos/${slug}/stream`;
}

export function getAudioUrl(slug: string): string {
  return `${BASE}/api/videos/${slug}/audio`;
}

export function getMediaUrl(slug: string, index: number): string {
  return `${BASE}/api/videos/${slug}/media/${index}`;
}

export async function likeVideo(slug: string): Promise<{ liked: boolean; likes: number }> {
  const r = await fetch(`${BASE}/api/videos/${slug}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!r.ok) throw new Error("Failed to like");
  return r.json();
}

export async function fetchComments(slug: string): Promise<Comment[]> {
  const r = await fetch(`${BASE}/api/videos/${slug}/comments`);
  if (!r.ok) throw new Error("Failed to fetch comments");
  return r.json();
}

export async function addComment(slug: string, text: string): Promise<Comment> {
  const r = await fetch(`${BASE}/api/videos/${slug}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, userId }),
  });
  if (!r.ok) throw new Error("Failed to post comment");
  return r.json();
}

export async function uploadVideo(
  files: File[],
  title: string,
  description: string,
  audioFile?: File,
  onProgress?: (p: number) => void
): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    formData.append("title", title);
    formData.append("description", description);
    formData.append("userId", userId);
    if (audioFile) formData.append("audio", audioFile);

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

export async function deleteVideo(slug: string): Promise<void> {
  const r = await fetch(`${BASE}/api/videos/${slug}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!r.ok) throw new Error("Failed to delete");
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
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
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}
