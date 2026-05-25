import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import { pool, initDb, generateNickname } from "./db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
});

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 40);
  return `${base}-${uuidv4().substring(0, 8)}`;
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Create or get user
app.post("/api/user", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  let user = await pool.query("SELECT id, nickname FROM users WHERE id = $1", [userId]);
  
  if (!user.rows.length) {
    const nickname = await generateNickname();
    user = await pool.query(
      "INSERT INTO users (id, nickname) VALUES ($1, $2) RETURNING id, nickname",
      [userId, nickname]
    );
  }

  res.json(user.rows[0]);
});

// Get feed
app.get("/api/videos", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const offset = parseInt(req.query.offset as string) || 0;
  const userId = (req.query.userId as string) || "";

  const result = await pool.query(
    `SELECT v.id, v.slug, v.title, v.description, v.file_type, v.file_size,
            v.duration, v.views, v.likes, v.created_at, v.user_id,
            v.media_data, v.audio_title,
            u.nickname as user_nickname,
            (SELECT COUNT(*) FROM comments c WHERE c.video_id = v.id) as comment_count,
            ${userId ? `(SELECT COUNT(*) FROM likes l WHERE l.video_id = v.id AND l.user_id = $3) > 0` : "false"} as is_liked
     FROM videos v
     JOIN users u ON v.user_id = u.id
     ORDER BY v.created_at DESC
     LIMIT $1 OFFSET $2`,
    userId ? [limit, offset, userId] : [limit, offset]
  );

  const total = await pool.query("SELECT COUNT(*) FROM videos");

  const videos = result.rows.map((row) => ({
    ...row,
    media_urls: row.media_data && row.media_data.length > 0
      ? row.media_data.map((_: unknown, i: number) => `/api/videos/${row.slug}/media/${i}`)
      : null,
    audio_url: row.audio_title ? `/api/videos/${row.slug}/audio` : null,
  }));

  res.json({
    videos,
    total: parseInt(total.rows[0].count),
    hasMore: offset + limit < parseInt(total.rows[0].count),
  });
});

// Get user videos
app.get("/api/users/:userId/videos", async (req, res) => {
  const { userId: targetUserId } = req.params;
  const userId = (req.query.userId as string) || "";

  const result = await pool.query(
    `SELECT v.id, v.slug, v.title, v.description, v.file_type, v.file_size,
            v.duration, v.views, v.likes, v.created_at, v.user_id,
            v.media_data, v.audio_title,
            u.nickname as user_nickname,
            (SELECT COUNT(*) FROM comments c WHERE c.video_id = v.id) as comment_count,
            ${userId ? `(SELECT COUNT(*) FROM likes l WHERE l.video_id = v.id AND l.user_id = $2) > 0` : "false"} as is_liked
     FROM videos v
     JOIN users u ON v.user_id = u.id
     WHERE v.user_id = $1
     ORDER BY v.created_at DESC`,
    userId ? [targetUserId, userId] : [targetUserId]
  );

  const videos = result.rows.map((row) => ({
    ...row,
    media_urls: row.media_data && row.media_data.length > 0
      ? row.media_data.map((_: unknown, i: number) => `/api/videos/${row.slug}/media/${i}`)
      : null,
    audio_url: row.audio_title ? `/api/videos/${row.slug}/audio` : null,
  }));

  res.json(videos);
});

// Get single video
app.get("/api/videos/:slug", async (req, res) => {
  const { slug } = req.params;
  const userId = (req.query.userId as string) || "";

  const result = await pool.query(
    `SELECT v.id, v.slug, v.title, v.description, v.file_type, v.file_size,
            v.duration, v.views, v.likes, v.created_at, v.user_id,
            v.media_data, v.audio_title,
            u.nickname as user_nickname,
            (SELECT COUNT(*) FROM comments c WHERE c.video_id = v.id) as comment_count,
            ${userId ? `(SELECT COUNT(*) FROM likes l WHERE l.video_id = v.id AND l.user_id = $2) > 0` : "false"} as is_liked
     FROM videos v
     JOIN users u ON v.user_id = u.id
     WHERE v.slug = $1`,
    userId ? [slug, userId] : [slug]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: "Not found" });
  }

  await pool.query("UPDATE videos SET views = views + 1 WHERE slug = $1", [slug]);

  const video = result.rows[0];
  res.json({
    ...video,
    media_urls: video.media_data && video.media_data.length > 0
      ? video.media_data.map((_: unknown, i: number) => `/api/videos/${slug}/media/${i}`)
      : null,
    audio_url: video.audio_title ? `/api/videos/${slug}/audio` : null,
  });
});

// Stream video/media
app.get("/api/videos/:slug/stream", async (req, res) => {
  const { slug } = req.params;
  const result = await pool.query(
    "SELECT file_data, file_type, file_size FROM videos WHERE slug = $1",
    [slug]
  );

  if (!result.rows.length || !result.rows[0].file_data) {
    return res.status(404).json({ error: "Not found" });
  }

  const { file_data, file_type, file_size } = result.rows[0];
  const buffer: Buffer = file_data;
  const size = parseInt(file_size);

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": file_type,
      "Cache-Control": "public, max-age=3600",
    });
    res.end(buffer.slice(start, end + 1));
  } else {
    res.writeHead(200, {
      "Content-Length": size,
      "Content-Type": file_type,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    });
    res.end(buffer);
  }
});

// Get media item
app.get("/api/videos/:slug/media/:index", async (req, res) => {
  const { slug, index } = req.params;
  const idx = parseInt(index);

  const result = await pool.query("SELECT media_data FROM videos WHERE slug = $1", [slug]);
  if (!result.rows.length || !result.rows[0].media_data) {
    return res.status(404).json({ error: "Not found" });
  }

  const media = result.rows[0].media_data[idx];
  if (!media) return res.status(404).json({ error: "Media not found" });

  const buffer = Buffer.from(media.data, "base64");
  res.writeHead(200, {
    "Content-Type": media.type,
    "Content-Length": buffer.length,
    "Cache-Control": "public, max-age=86400",
  });
  res.end(buffer);
});

// Get audio
app.get("/api/videos/:slug/audio", async (req, res) => {
  const { slug } = req.params;
  const result = await pool.query(
    "SELECT audio_data, audio_type FROM videos WHERE slug = $1",
    [slug]
  );

  if (!result.rows.length || !result.rows[0].audio_data) {
    return res.status(404).json({ error: "No audio" });
  }

  res.writeHead(200, {
    "Content-Type": result.rows[0].audio_type,
    "Cache-Control": "public, max-age=86400",
  });
  res.end(result.rows[0].audio_data);
});

// Upload
app.post("/api/upload", upload.fields([
  { name: "files", maxCount: 10 },
  { name: "audio", maxCount: 1 }
]), async (req, res) => {
  const files = (req.files as { [fieldname: string]: Express.Multer.File[] })?.files || [];
  const audioFiles = (req.files as { [fieldname: string]: Express.Multer.File[] })?.audio || [];

  if (files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const { title = "Untitled", description = "", userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const slug = generateSlug(title || "video");

  let fileData = null;
  let fileType = null;
  let fileSize = 0;
  const mediaData: Array<{ type: string; data: string }> = [];

  if (files.length === 1 && files[0].mimetype.startsWith("video/")) {
    fileData = files[0].buffer;
    fileType = files[0].mimetype;
    fileSize = files[0].size;
  } else {
    files.forEach((f) => {
      mediaData.push({
        type: f.mimetype,
        data: f.buffer.toString("base64"),
      });
    });
  }

  let audioData = null;
  let audioType = null;
  let audioTitle = null;

  if (audioFiles.length > 0) {
    audioData = audioFiles[0].buffer;
    audioType = audioFiles[0].mimetype;
    audioTitle = audioFiles[0].originalname;
  }

  const result = await pool.query(
    `INSERT INTO videos (slug, title, description, user_id, file_data, file_type, file_size, media_data, audio_data, audio_type, audio_title)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, slug, title, description, user_id, file_type, file_size, duration, views, likes, created_at, audio_title`,
    [
      slug,
      title.substring(0, 200),
      description.substring(0, 1000),
      userId,
      fileData,
      fileType,
      fileSize,
      JSON.stringify(mediaData),
      audioData,
      audioType,
      audioTitle,
    ]
  );

  const user = await pool.query("SELECT nickname FROM users WHERE id = $1", [userId]);

  res.json({
    ...result.rows[0],
    user_nickname: user.rows[0].nickname,
    comment_count: 0,
    is_liked: false,
  });
});

// Delete video
app.delete("/api/videos/:slug", async (req, res) => {
  const { slug } = req.params;
  const { userId } = req.body;

  const video = await pool.query("SELECT user_id FROM videos WHERE slug = $1", [slug]);
  if (!video.rows.length) return res.status(404).json({ error: "Not found" });
  if (video.rows[0].user_id !== userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await pool.query("DELETE FROM videos WHERE slug = $1", [slug]);
  res.json({ success: true });
});

// Like
app.post("/api/videos/:slug/like", async (req, res) => {
  const { slug } = req.params;
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: "userId required" });

  const video = await pool.query("SELECT id FROM videos WHERE slug = $1", [slug]);
  if (!video.rows.length) return res.status(404).json({ error: "Not found" });

  const videoId = video.rows[0].id;

  const existing = await pool.query(
    "SELECT id FROM likes WHERE video_id = $1 AND user_id = $2",
    [videoId, userId]
  );

  let liked: boolean;
  if (existing.rows.length) {
    await pool.query("DELETE FROM likes WHERE video_id = $1 AND user_id = $2", [videoId, userId]);
    await pool.query("UPDATE videos SET likes = GREATEST(0, likes - 1) WHERE id = $1", [videoId]);
    liked = false;
  } else {
    await pool.query("INSERT INTO likes (video_id, user_id) VALUES ($1, $2)", [videoId, userId]);
    await pool.query("UPDATE videos SET likes = likes + 1 WHERE id = $1", [videoId]);
    liked = true;
  }

  const updated = await pool.query("SELECT likes FROM videos WHERE id = $1", [videoId]);
  res.json({ liked, likes: parseInt(updated.rows[0].likes) });
});

// Get comments
app.get("/api/videos/:slug/comments", async (req, res) => {
  const { slug } = req.params;
  const video = await pool.query("SELECT id FROM videos WHERE slug = $1", [slug]);
  if (!video.rows.length) return res.status(404).json({ error: "Not found" });

  const comments = await pool.query(
    `SELECT c.id, c.text, c.created_at, u.nickname as user_nickname
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.video_id = $1
     ORDER BY c.created_at DESC
     LIMIT 100`,
    [video.rows[0].id]
  );

  res.json(comments.rows);
});

// Add comment
app.post("/api/videos/:slug/comments", async (req, res) => {
  const { slug } = req.params;
  const { text, userId } = req.body;

  if (!text?.trim()) return res.status(400).json({ error: "Text required" });
  if (!userId) return res.status(400).json({ error: "userId required" });

  const video = await pool.query("SELECT id FROM videos WHERE slug = $1", [slug]);
  if (!video.rows.length) return res.status(404).json({ error: "Not found" });

  const result = await pool.query(
    `INSERT INTO comments (video_id, user_id, text)
     VALUES ($1, $2, $3)
     RETURNING id, text, created_at`,
    [video.rows[0].id, userId, text.substring(0, 500)]
  );

  const user = await pool.query("SELECT nickname FROM users WHERE id = $1", [userId]);

  res.json({
    ...result.rows[0],
    user_nickname: user.rows[0].nickname,
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(distPath, "index.html"));
    }
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to init DB:", err);
    process.exit(1);
  });
