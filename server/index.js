import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import memoriesRoutes from './routes/memories.js';
import pushRoutes from './routes/push.js';
import { startReminderCron } from './cron/reminder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const cookieSecret = process.env.COOKIE_SECRET || 'super-secret-cookie-key';

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;

// Ensure uploads directory exists
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser(cookieSecret));

// Static files
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '../dist')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/memories', memoriesRoutes);
app.use('/api/push', pushRoutes);

// Start cron jobs
startReminderCron();

// Catch-all route to serve the frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, '::', () => {
  console.log(`Server started successfully. Listening on port ${port}`);
});
