import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createMemory, getMemoriesByUser, getMemoryById, deleteMemory, updateLastUpload } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

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

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB
});

router.post('/', authenticate, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: 'Unknown upload error' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { title, description } = req.body;
      if (!title) {
        // cleanup file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Title is required' });
      }

      const memory = createMemory({
        id: uuidv4(),
        userId: req.user.id,
        title,
        description: description || '',
        filePath: req.file.filename, // storing just the filename for static serving
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size
      });

      updateLastUpload(req.user.id);

      res.status(201).json(memory);
    } catch (error) {
      console.error('Create memory error:', error);
      res.status(500).json({ error: 'Internal server error' });
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

router.get('/:id', authenticate, (req, res) => {
  try {
    const memory = getMemoryById(req.params.id);
    
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    if (memory.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
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

    deleteMemory(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete memory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
