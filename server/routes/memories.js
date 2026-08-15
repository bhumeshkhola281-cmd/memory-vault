import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { 
  createMemory, getMemoriesByUser, getMemoryById, deleteMemory, updateLastUpload,
  getOnThisDayMemories, getMutedDates, addMutedDate, removeMutedDate,
  getAlbumsByUser, createAlbum, getAlbumById, getMemoriesByAlbum, addMemoryToAlbum,
  getWeeklyUploadUsage
} from '../db.js';
import { authenticate } from '../middleware/auth.js';

import { isDriveConfigured, uploadToDrive, deleteFromDrive } from '../utils/gdrive.js';

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
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB per upload (local storage mode)
const WEEKLY_QUOTA = 500 * 1024 * 1024;  // 500 MB per week (local storage mode)

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE }
});

router.post('/', authenticate, (req, res) => {
  upload.fields([{ name: 'file', maxCount: 1 }, { name: 'voiceNote', maxCount: 1 }])(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 1 GB per upload.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: 'Unknown upload error' });
    }

    try {
      const mainFile = req.files && req.files['file'] ? req.files['file'][0] : null;
      const voiceFile = req.files && req.files['voiceNote'] ? req.files['voiceNote'][0] : null;

      if (!mainFile) {
        if (voiceFile) fs.unlinkSync(voiceFile.path);
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Check weekly quota
      const weeklyUsed = getWeeklyUploadUsage(req.user.id);
      const thisUploadSize = mainFile.size + (voiceFile ? voiceFile.size : 0);
      if (weeklyUsed + thisUploadSize > WEEKLY_QUOTA) {
        fs.unlinkSync(mainFile.path);
        if (voiceFile) fs.unlinkSync(voiceFile.path);
        const usedGB = (weeklyUsed / (1024 * 1024 * 1024)).toFixed(2);
        const remainingMB = Math.max(0, ((WEEKLY_QUOTA - weeklyUsed) / (1024 * 1024))).toFixed(0);
        return res.status(429).json({ error: `Weekly upload limit reached. You have used ${usedGB} GB of 5 GB this week. ${remainingMB} MB remaining.` });
      }

      const { title, description, sealed_until } = req.body;
      if (!title) {
        fs.unlinkSync(mainFile.path);
        if (voiceFile) fs.unlinkSync(voiceFile.path);
        return res.status(400).json({ error: 'Title is required' });
      }

      if (sealed_until && isNaN(new Date(sealed_until).getTime())) {
        fs.unlinkSync(mainFile.path);
        if (voiceFile) fs.unlinkSync(voiceFile.path);
        return res.status(400).json({ error: 'Invalid sealed_until date' });
      }

      let gdriveFileId = null;
      let gdriveVoiceFileId = null;

      if (isDriveConfigured()) {
        try {
          const driveRes = await uploadToDrive(mainFile.path, mainFile.filename, mainFile.mimetype);
          gdriveFileId = driveRes.id;
          fs.unlink(mainFile.path, () => {});

          if (voiceFile) {
            const voiceDriveRes = await uploadToDrive(voiceFile.path, voiceFile.filename, voiceFile.mimetype);
            gdriveVoiceFileId = voiceDriveRes.id;
            fs.unlink(voiceFile.path, () => {});
          }
        } catch (driveErr) {
          // Drive failed — keep files locally, don't block the upload
          console.error('Google Drive upload failed, keeping files locally:', driveErr.message);
        }
      }

      const memory = createMemory({
        id: uuidv4(),
        userId: req.user.id,
        title,
        description: description || '',
        filePath: mainFile.filename, // storing filename
        fileName: mainFile.originalname,
        fileType: mainFile.mimetype,
        fileSize: mainFile.size,
        voiceNotePath: voiceFile ? voiceFile.filename : null,
        sealedUntil: sealed_until || null,
        gdriveFileId,
        gdriveVoiceFileId
      });

      updateLastUpload(req.user.id);

      res.status(201).json(memory);
    } catch (error) {
      console.error('Create memory error:', error.message, error.stack);
      res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
  });
});

router.get('/', authenticate, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type;
    const search = req.query.search;

    const { memories, total } = getMemoriesByUser(req.user.id, page, limit, type, search);
    
    res.json({
      memories,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/settings/muted-dates', authenticate, (req, res) => {
  try {
    const dates = getMutedDates(req.user.id);
    res.json({ dates });
  } catch (error) {
    console.error('Get muted dates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/settings/muted-dates', authenticate, (req, res) => {
  try {
    const { month, day, reason } = req.body;
    if (!month || !day) return res.status(400).json({ error: 'Month and day required' });
    const id = uuidv4();
    addMutedDate(id, req.user.id, month, day, reason || '');
    res.json({ success: true, id });
  } catch (error) {
    console.error('Add muted date error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/settings/muted-dates/:id', authenticate, (req, res) => {
  try {
    removeMutedDate(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete muted date error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/on-this-day', authenticate, (req, res) => {
  try {
    const memories = getOnThisDayMemories(req.user.id);
    res.json({ memories });
  } catch (error) {
    console.error('On this day error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/albums/all', authenticate, (req, res) => {
  try { res.json(getAlbumsByUser(req.user.id)); } catch(e) { res.status(500).json({error: 'Server error'}); }
});

router.post('/albums', authenticate, (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({error: 'Title required'});
    const id = uuidv4();
    createAlbum(id, req.user.id, title, description || '');
    res.json(getAlbumById(id, req.user.id));
  } catch(e) { res.status(500).json({error: 'Server error'}); }
});

router.get('/albums/:id', authenticate, (req, res) => {
  try {
    const album = getAlbumById(req.params.id, req.user.id);
    if (!album) return res.status(404).json({error: 'Not found'});
    const memories = getMemoriesByAlbum(album.id, req.user.id);
    res.json({ ...album, memories });
  } catch(e) { res.status(500).json({error: 'Server error'}); }
});

router.post('/albums/:id/memories', authenticate, (req, res) => {
  try {
    const memoryId = req.body.memoryId || req.body.memory_id;
    if (!memoryId) return res.status(400).json({error: 'memoryId required'});
    addMemoryToAlbum(req.params.id, memoryId);
    res.json({success: true});
  } catch(e) { res.status(500).json({error: 'Server error'}); }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const memory = getMemoryById(req.params.id);
    
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    if (memory.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (memory.sealed_until && new Date() < new Date(memory.sealed_until)) {
      memory.file_path = null;
      memory.is_sealed = true;
    }

    res.json(memory);
  } catch (error) {
    console.error('Get memory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    const memory = getMemoryById(req.params.id);
    
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    if (memory.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete file
    try {
      const filePath = path.join(uploadsDir, memory.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsError) {
      console.error('File deletion error:', fsError);
    }
    
    // Delete voice note if exists
    if (memory.voice_note_path) {
      try {
        const voiceNotePath = path.join(uploadsDir, memory.voice_note_path);
        if (fs.existsSync(voiceNotePath)) {
          fs.unlinkSync(voiceNotePath);
        }
      } catch (fsError) {
        console.error('Voice note deletion error:', fsError);
      }
    }

    if (memory.gdrive_file_id) {
      deleteFromDrive(memory.gdrive_file_id).catch(e => console.error('Drive delete error:', e));
    }
    if (memory.gdrive_voice_file_id) {
      deleteFromDrive(memory.gdrive_voice_file_id).catch(e => console.error('Drive voice delete error:', e));
    }

    deleteMemory(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete memory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
