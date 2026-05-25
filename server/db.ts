import { Pool } from "pg";

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_PUBLIC_URL ||
    "postgresql://postgres:DVdHIeNDcAFoRjeZNHDWtyNpWOitDQNK@zephyr.proxy.rlwy.net:34640/railway",
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        file_data BYTEA NOT NULL,
        file_type TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        thumbnail BYTEA,
        duration REAL DEFAULT 0,
        views BIGINT DEFAULT 0,
        likes BIGINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        author TEXT NOT NULL DEFAULT 'Anonymous',
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(video_id, session_id)
      );

      CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
      CREATE INDEX IF NOT EXISTS idx_likes_video_id ON likes(video_id);
    `);
    console.log("Database initialized");
  } finally {
    client.release();
  }
}
