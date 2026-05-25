import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import { pool, initDb } from "./db.js";

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
  fileFilter: (_req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/mov", "video/quicktime", "image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file type"));
  },
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

// Get feed (paginated)
app.get("/api/videos", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const offset = parseInt(req.query.offset as string) || 0;
  const sessionId = (req.query.sessionId as string) || "";

  const result = await pool.query(
    `SELECT v.id, v.slug, v.title, v.description, v.file_type, v.file_size,
            v.duration, v.views, v.likes, v.created_at,
            (SELECT COUNT(*) FROM comments c WHERE c.video_id = v.id) as comment_count,
            ${sessionId ? `(SELECT COUNT(*) FROM likes l WHERE l.video_id = v.id AND l.session_id = $3) > 0` : "false"} as is_liked
     FROM videos v
     ORDER BY v.created_at DESC
     LIMIT $1 OFFSET $2`,
    sessionId ? [limit, offset, sessionId] : [limit, offset]
  );

  const total = await pool.query("SELECT COUNT(*) FROM videos");

  res.json({
    videos: result.rows,
    total: parseInt(total.rows[0].count),
    hasMore: offset + limit < parseInt(total.rows[0].count),
  });
});

// Get single video info
app.get("/api/videos/:slug", async (req, res) => {
  const { slug } = req.params;
  const sessionId = (req.query.sessionId as string) || "";

  const result = await pool.query(
    `SELECT v.id, v.slug, v.title, v.description, v.file_type, v.file_size,
            v.duration, v.views, v.likes, v.created_at,
            (SELECT COUNT(*) FROM comments c WHERE c.video_id = v.id) as comment_count,
            ${sessionId ? `(SELECT COUNT(*) FROM likes l WHERE l.video_id = v.id AND l.session_id = $2) > 0` : "false"} as is_liked
     FROM videos v WHERE v.slug = $1`,
    sessionId ? [slug, sessionId] : [slug]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: "Not found" });
  }

  // increment views
  await pool.query("UPDATE videos SET views = views + 1 WHERE slug = $1", [slug]);

  res.json(result.rows[0]);
});

// Stream video
app.get("/api/videos/:slug/stream", async (req, res) => {
  const { slug } = req.params;

  const result = await pool.query(
    "SELECT file_data, file_type, file_size FROM videos WHERE slug = $1",
    [slug]
  );

  if (!result.rows.length) {
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

// Get thumbnail
app.get("/api/videos/:slug/thumbnail", async (req, res) => {
  const { slug } = req.params;
  const result = await pool.query(
    "SELECT thumbnail FROM videos WHERE slug = $1",
    [slug]
  );

  if (!result.rows.length || !result.rows[0].thumbnail) {
    return res.status(404).json({ error: "No thumbnail" });
  }

  res.writeHead(200, {
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=86400",
  });
  res.end(result.rows[0].thumbnail);
});

// Upload video/image
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { title = "Untitled", description = "" } = req.body;
  const slug = generateSlug(title || "video");
  const thumbnailBase64 = req.body.thumbnail;

  let thumbnailBuffer: Buffer | null = null;
  if (thumbnailBase64) {
    const base64Data = thumbnailBase64.replace(/^data:image\/\w+;base64,/, "");
    thumbnailBuffer = Buffer.from(base64Data, "base64");
  }

  const result = await pool.query(
    `INSERT INTO videos (slug, title, description, file_data, file_type, file_size, thumbnail)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, slug, title, description, file_type, file_size, duration, views, likes, created_at`,
    [
      slug,
      title.substring(0, 200),
      description.substring(0, 1000),
      req.file.buffer,
      req.file.mimetype,
      req.file.size,
      thumbnailBuffer,
    ]
  );

  res.json(result.rows[0]);
});

// Like / unlike
app.post("/api/videos/:slug/like", async (req, res) => {
  const { slug } = req.params;
  const { sessionId } = req.body;

  if (!sessionId) return res.status(400).json({ error: "sessionId required" });

  const video = await pool.query("SELECT id FROM videos WHERE slug = $1", [slug]);
  if (!video.rows.length) return res.status(404).json({ error: "Not found" });

  const videoId = video.rows[0].id;

  const existing = await pool.query(
    "SELECT id FROM likes WHERE video_id = $1 AND session_id = $2",
    [videoId, sessionId]
  );

  let liked: boolean;
  if (existing.rows.length) {
    await pool.query("DELETE FROM likes WHERE video_id = $1 AND session_id = $2", [videoId, sessionId]);
    await pool.query("UPDATE videos SET likes = GREATEST(0, likes - 1) WHERE id = $1", [videoId]);
    liked = false;
  } else {
    await pool.query("INSERT INTO likes (video_id, session_id) VALUES ($1, $2)", [videoId, sessionId]);
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
    "SELECT id, author, text, created_at FROM comments WHERE video_id = $1 ORDER BY created_at DESC LIMIT 100",
    [video.rows[0].id]
  );

  res.json(comments.rows);
});

// Add comment
app.post("/api/videos/:slug/comments", async (req, res) => {
  const { slug } = req.params;
  const { author = "Anonymous", text } = req.body;

  if (!text?.trim()) return res.status(400).json({ error: "Text required" });

  const video = await pool.query("SELECT id FROM videos WHERE slug = $1", [slug]);
  if (!video.rows.length) return res.status(404).json({ error: "Not found" });

  const result = await pool.query(
    "INSERT INTO comments (video_id, author, text) VALUES ($1, $2, $3) RETURNING id, author, text, created_at",
    [video.rows[0].id, author.substring(0, 50), text.substring(0, 500)]
  );

  res.json(result.rows[0]);
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
