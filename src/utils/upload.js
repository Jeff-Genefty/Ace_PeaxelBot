import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { resolve } from 'path';

const UPLOAD_DIR = resolve('./uploads');
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 8);
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.bin';
        cb(null, `broadcast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`);
    },
});

function imageFileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
        return cb(new Error('INVALID_UPLOAD_MIME'));
    }
    cb(null, true);
}

/** Upload image broadcast : MIME whitelist + taille max 5 Mo */
export const broadcastUpload = multer({
    storage,
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    fileFilter: imageFileFilter,
});

export function handleBroadcastUploadError(err, req, res, next) {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send(req.t?.('admin.uploadTooLarge') || 'Fichier trop volumineux (max 5 Mo).');
        }
        return res.status(400).send(req.t?.('admin.uploadRejected') || 'Upload refusé.');
    }
    if (err.message === 'INVALID_UPLOAD_MIME') {
        return res.status(400).send(req.t?.('admin.uploadMime') || 'Type de fichier non autorisé (JPEG, PNG, WebP, GIF).');
    }
    next(err);
}
