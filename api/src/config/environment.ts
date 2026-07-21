import { config as loadDotenv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load project-root .env.local (Next.js convention) explicitly,
// since dotenv only auto-loads .env by default.
loadDotenv({ path: path.resolve(__dirname, '..', '..', '..', '.env.local') })
loadDotenv({ path: path.resolve(__dirname, '..', '..', '..', '.env') })

export function loadEnv() {
  // dotenv/config (imported above) already loaded .env from project root
}

export function getEnv() {
  const env = {
    PORT: Number(process.env.PORT || 5000),
    MONGODB_URI: process.env.MONGODB_URI || '',
    MONGODB_DB: process.env.MONGODB_DB || 'school',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    NODE_ENV: process.env.NODE_ENV || 'development',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  }

  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Set it in .env.local or environment.')
  }

  return env
}

export const ROOT_DIR = path.resolve(__dirname, '..', '..')
