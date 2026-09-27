const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure base upload directories exist
const uploadBaseDir = path.join(__dirname, '..', 'uploads');
const playersDir = path.join(uploadBaseDir, 'players');
const teamsDir = path.join(uploadBaseDir, 'teams');

[uploadBaseDir, playersDir, teamsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.query.type || req.body.type || 'players';
    if (uploadType === 'teams') {
      cb(null, teamsDir);
    } else {
      cb(null, playersDir);
    }
  },
  filename: (req, file, cb) => {
    // Generate clean, secure filename
    const cleanExt = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${cleanBase}-${uniqueSuffix}${cleanExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and WebP images are allowed (max 2MB).'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB maximum
  },
  fileFilter,
});

module.exports = {
  upload,
  uploadBaseDir,
};
