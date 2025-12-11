const express = require('express');
const path = require('path');
const multer = require('multer');
const jobsController = require('./controllers/jobsController');
const statusController = require('./controllers/statusController');
const authController = require('./controllers/authController');
const adminController = require('./controllers/adminController');
const meController = require('./controllers/meController');
const { requireAdminAuth, requireAuthJson } = require('./middleware/authMiddleware');

const router = express.Router();

// Multer setup for avatar uploads
const avatarUploadDir = path.join(__dirname, '..', 'web', 'assets', 'users');
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarUploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = (file.originalname || 'avatar')
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'avatar';
    const timestamp = Date.now();
    cb(null, `${timestamp}-${safeName}`);
  },
});

function imageFileFilter(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image uploads are allowed'));
  }
  cb(null, true);
}

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

// Health / status
router.get('/status', statusController.getStatus);

// Auth
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);

// Current user (/me)
router.get('/me', requireAuthJson, meController.getMe);
router.patch('/me/profile', requireAuthJson, meController.updateProfile);
router.post('/me/password', requireAuthJson, meController.changePassword);
router.post('/me/avatar', requireAuthJson, uploadAvatar.single('avatar'), meController.uploadAvatar);

// Admin
router.get('/admin/users', requireAdminAuth, adminController.getUsers);
router.post('/admin/users/:id/role', requireAdminAuth, adminController.updateUserRole);

// Job-related endpoints
router.get('/jobs', jobsController.listJobs);
router.get('/jobs/:address/latest', jobsController.getJobWithLatestSnapshot);
router.post('/jobs/:address/active', jobsController.setJobActiveFlag);
router.post('/jobs/scrape', jobsController.scrapeAndSnapshotJob);
router.post('/jobs/scrape-batch', jobsController.scrapeAndSnapshotJobsBatch);

module.exports = router;