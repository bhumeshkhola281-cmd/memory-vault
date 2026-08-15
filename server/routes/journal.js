import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createOrUpdateJournalEntry, getJournalEntry, getJournalMonth, calculateStreak } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { isDriveConfigured, uploadToDrive } from '../utils/gdrive.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..');
const uploadsDir = path.join(dataDir, 'uploads');

// Ensure uploads dir exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'journal-' + uuidv4() + ext);
  }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/', authenticate, (req, res) => {
  upload.fields([{ name: 'voiceNote', maxCount: 1 }, { name: 'photo', maxCount: 1 }])(req, res, async (err) => {
    if (err) return res.status(400).json({ error: 'Upload error' });
    try {
      const { content, mood, entry_type, entry_date } = req.body;
      const voiceFile = req.files && req.files['voiceNote'] ? req.files['voiceNote'][0] : null;
      const photoFile = req.files && req.files['photo'] ? req.files['photo'][0] : null;
      
      const today = entry_date || new Date().toISOString().split('T')[0];
      const id = uuidv4();
      
      let gdriveVoiceId = null;
      let gdrivePhotoId = null;

      if (isDriveConfigured()) {
        try {
          if (voiceFile) {
            const vRes = await uploadToDrive(voiceFile.path, voiceFile.filename, voiceFile.mimetype);
            gdriveVoiceId = vRes.id;
            fs.unlink(voiceFile.path, () => {});
          }
          if (photoFile) {
            const pRes = await uploadToDrive(photoFile.path, photoFile.filename, photoFile.mimetype);
            gdrivePhotoId = pRes.id;
            fs.unlink(photoFile.path, () => {});
          }
        } catch (driveErr) {
          console.error('Google Drive journal upload error:', driveErr.message);
        }
      }

      const entry = createOrUpdateJournalEntry(
        id, req.user.id, today,
        content || '', mood || '',
        voiceFile ? voiceFile.filename : null,
        photoFile ? photoFile.filename : null,
        entry_type || 'text',
        gdriveVoiceId,
        gdrivePhotoId
      );
      
      res.status(201).json(entry);
    } catch (error) {
      console.error('Journal entry error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

router.get('/today', authenticate, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const entry = getJournalEntry(req.user.id, today);
    res.json(entry || { empty: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/streak', authenticate, (req, res) => {
  try {
    const streak = calculateStreak(req.user.id);
    // Determine vault level
    let vaultLevel = 'empty';
    let vaultLabel = 'Your story starts today';
    const s = streak.current;
    if (s >= 365) { vaultLevel = 'grand'; vaultLabel = 'Heirloom Master'; }
    else if (s >= 100) { vaultLevel = 'walkin'; vaultLabel = 'Vault Guardian'; }
    else if (s >= 60) { vaultLevel = 'room'; vaultLabel = 'Your vault is taking shape'; }
    else if (s >= 30) { vaultLevel = 'gilded'; vaultLabel = 'Consistent Storyteller'; }
    else if (s >= 14) { vaultLevel = 'leather'; vaultLabel = 'Building something real'; }
    else if (s >= 7) { vaultLevel = 'wooden'; vaultLabel = 'Momentum'; }
    else if (s >= 1) { vaultLevel = 'tin'; vaultLabel = 'A beginning'; }
    
    res.json({ ...streak, vaultLevel, vaultLabel });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/month/:year/:month', authenticate, (req, res) => {
  try {
    const entries = getJournalMonth(req.user.id, req.params.year, req.params.month);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:date', authenticate, (req, res) => {
  try {
    const entry = getJournalEntry(req.user.id, req.params.date);
    res.json(entry || { empty: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
