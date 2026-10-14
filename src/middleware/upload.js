const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Envie apenas imagens (JPG, PNG, WEBP, GIF ou AVIF).'));
  },
});

/**
 * Converte os arquivos enviados para WebP redimensionado e grava em /public/uploads.
 * Preenche req.savedImages = ['/uploads/xxx.webp', ...]
 */
function processImages(prefix = 'img', maxWidth = 1400) {
  return async (req, res, next) => {
    try {
      const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : req.file ? [req.file] : [];
      req.savedImages = [];
      req.savedByField = {};
      for (const file of files) {
        const name = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webp`;
        await sharp(file.buffer)
          .rotate()
          .resize({ width: maxWidth, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(path.join(UPLOAD_DIR, name));
        const url = `/uploads/${name}`;
        req.savedImages.push(url);
        (req.savedByField[file.fieldname] = req.savedByField[file.fieldname] || []).push(url);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

function removeImage(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(url));
  fs.promises.unlink(file).catch(() => {});
}

module.exports = { upload, processImages, removeImage };
