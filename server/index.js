import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import memoriesRoutes from './routes/memories.js';
import pushRoutes from './routes/push.js';
import journalRoutes from './routes/journal.js';
import { startReminderCron } from './cron/reminder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const cookieSecret = process.env.COOKIE_SECRET || 'super-secret-cookie-key';

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;

import { getMemoryByFilename } from './db.js';
import { getDriveStream, isDriveConfigured } from './utils/gdrive.js';

// Ensure uploads directory exists
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Google Drive status check on boot
console.log('[GDrive] GOOGLE_CLIENT_ID set:', !!process.env.GOOGLE_CLIENT_ID);
console.log('[GDrive] GOOGLE_REFRESH_TOKEN set:', !!process.env.GOOGLE_REFRESH_TOKEN);
console.log('[GDrive] GOOGLE_DRIVE_FOLDER_ID set:', !!process.env.GOOGLE_DRIVE_FOLDER_ID);
console.log('[GDrive] isDriveConfigured():', isDriveConfigured());

// Safe cleanup: only delete local files that ARE confirmed backed up in Google Drive
if (isDriveConfigured()) {
  try {
    const files = fs.readdirSync(uploadsDir);
    let cleaned = 0;
    files.forEach(f => {
      const record = getMemoryByFilename(f);
      if (record && (record.gdrive_file_id || record.gdrive_voice_file_id || record.gdrive_photo_id || record.gdrive_voice_id)) {
        try { fs.unlinkSync(path.join(uploadsDir, f)); cleaned++; } catch(e) {}
      }
    });
    if (cleaned > 0) console.log('[GDrive Cleanup] Purged ' + cleaned + ' confirmed-backed-up files from Railway volume');
  } catch (err) {
    console.error('Boot uploads cleanup error:', err.message);
  }
}

// Middleware
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser(cookieSecret));

// Health check - Railway pings this to verify the app is alive
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Storage diagnostic endpoint
app.get('/api/storage/status', (req, res) => {
  let uploadsCount = 0;
  let uploadsSize = 0;
  const fileList = [];
  try {
    const files = fs.readdirSync(uploadsDir);
    uploadsCount = files.length;
    files.forEach(f => {
      try {
        const stat = fs.statSync(path.join(uploadsDir, f));
        uploadsSize += stat.size;
        fileList.push({ name: f, size_mb: (stat.size / (1024 * 1024)).toFixed(2) });
      } catch(e) {}
    });
  } catch(e) {}
  // Sort largest first
  fileList.sort((a, b) => parseFloat(b.size_mb) - parseFloat(a.size_mb));
  res.json({
    gdrive_configured: isDriveConfigured(),
    local_uploads_count: uploadsCount,
    local_uploads_size_mb: (uploadsSize / (1024 * 1024)).toFixed(2),
    largest_files: fileList.slice(0, 20)
  });
});

// Admin cleanup: delete ALL local uploads to free volume space
app.post('/api/admin/cleanup', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    let cleaned = 0;
    let freedBytes = 0;
    files.forEach(f => {
      try {
        const stat = fs.statSync(path.join(uploadsDir, f));
        freedBytes += stat.size;
        fs.unlinkSync(path.join(uploadsDir, f));
        cleaned++;
      } catch(e) {}
    });
    res.json({
      deleted: cleaned,
      freed_mb: (freedBytes / (1024 * 1024)).toFixed(2)
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Dynamic /uploads route with Google Drive streaming fallback
app.get('/uploads/:filename', (req, res, next) => {
  const localPath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }
  const memory = getMemoryByFilename(req.params.filename);
  const gdriveId = memory?.gdrive_file_id || memory?.gdrive_voice_file_id || memory?.gdrive_photo_id || memory?.gdrive_voice_id;
  if (gdriveId) {
    return res.redirect(`/api/gdrive/stream/${gdriveId}`);
  }
  next();
});

// Static files fallback
app.use('/uploads', express.static(uploadsDir));

const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/memories', memoriesRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/journal', journalRoutes);

app.get('/api/gdrive/stream/:fileId', async (req, res) => {
  try {
    const range = req.headers.range;
    const { stream, headers } = await getDriveStream(req.params.fileId, range);
    
    if (headers['content-range']) res.setHeader('Content-Range', headers['content-range']);
    if (headers['content-length']) res.setHeader('Content-Length', headers['content-length']);
    if (headers['content-type']) res.setHeader('Content-Type', headers['content-type']);
    if (headers['accept-ranges']) res.setHeader('Accept-Ranges', headers['accept-ranges']);
    
    res.status(headers['content-range'] ? 206 : 200);
    stream.pipe(res);
  } catch (err) {
    console.error('Stream Drive error:', err.message);
    res.status(500).json({ error: 'Failed to stream file from Google Drive' });
  }
});

// Start cron jobs
startReminderCron();

// Catch-all route to serve the frontend SPA
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('Memory Vault server is running. Frontend not built yet.');
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server - NO host argument, let Node.js bind to all interfaces automatically
const server = app.listen(port, () => {
  console.log(`Memory Vault server listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Data directory: ${dataDir}`);
});

// Configure 15-minute timeouts for handling up to 1GB uploads reliably
server.timeout = 15 * 60 * 1000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.on('error', (err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
