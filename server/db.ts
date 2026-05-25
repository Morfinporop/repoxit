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
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        nickname TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_data BYTEA,
        file_type TEXT,
        file_size BIGINT,
        media_data JSONB DEFAULT '[]',
        audio_data BYTEA,
        audio_type TEXT,
        audio_title TEXT,
        duration REAL DEFAULT 0,
        views BIGINT DEFAULT 0,
        likes BIGINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(video_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
      CREATE INDEX IF NOT EXISTS idx_likes_video_id ON likes(video_id);
      CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
    `);
    console.log("Database initialized");
  } finally {
    client.release();
  }
}

export async function generateNickname(): Promise<string> {
  const num = Math.floor(10000000 + Math.random() * 90000000);
  return `Anonymous#${num}`;
}
