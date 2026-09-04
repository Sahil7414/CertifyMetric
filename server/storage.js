import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------------------------------------------------------
// Storage Configuration
// -----------------------------------------------------------------------------
// In production with a persistent volume (e.g., Render Disk, Railway Volume),
// STORAGE_DIR should be pointed to the mounted volume path, e.g., /data/uploads.
export const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(__dirname, 'uploads');

export const EVIDENCE_DIR = path.join(STORAGE_DIR, 'evidence');

export function initStorage() {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
}

// -----------------------------------------------------------------------------
// Upload Security Rules (Evidence Whitelist)
// -----------------------------------------------------------------------------
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

export const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.pdf'
]);

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Multer Disk Storage configured for persistent storage
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    initStorage();
    cb(null, EVIDENCE_DIR);
  },
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.bin';
    const randomHex = crypto.randomBytes(8).toString('hex');
    const uniqueName = `ev_${Date.now()}_${randomHex}${safeExt}`;
    cb(null, uniqueName);
  }
});

// File validation filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new Error('Invalid file format. Only JPEG, PNG, WebP images and PDF documents are permitted as legal verification evidence.'),
      false
    );
  }
  cb(null, true);
};

export const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
});

/**
 * Safely deletes a file from persistent storage, preventing path traversal attacks.
 */
export function deleteStoredFile(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return false;

  // Clean relative path (e.g. /uploads/evidence/filename.jpg -> evidence/filename.jpg)
  const normalized = relativePath.replace(/^\/?uploads\//, '');
  const resolvedPath = path.resolve(STORAGE_DIR, normalized);

  // Security guard: path must reside within STORAGE_DIR
  if (!resolvedPath.startsWith(STORAGE_DIR)) {
    console.warn(`Attempted unsafe file deletion outside storage directory: ${resolvedPath}`);
    return false;
  }

  try {
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
      return true;
    }
  } catch (err) {
    console.error(`Failed to delete stored file ${resolvedPath}:`, err);
  }
  return false;
}
