import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createUser, findUserByName } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { name, pin } = req.body;

    if (!name || name.length < 2 || name.length > 30) {
      return res.status(400).json({ error: 'Name must be between 2 and 30 characters' });
    }
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    const existingUser = findUserByName(name);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const userId = uuidv4();
    const user = createUser(userId, name, pinHash);

    // Remove hash before sending
    const { pin_hash, ...userWithoutHash } = user;

    res.cookie('session', user.id, {
      signed: true,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(201).json(userWithoutHash);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/signin', async (req, res) => {
  try {
    const { name, pin } = req.body;

    if (!name || !pin) {
      return res.status(400).json({ error: 'Name and PIN are required' });
    }

    const user = findUserByName(name);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const pinMatch = await bcrypt.compare(pin, user.pin_hash);
    if (!pinMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { pin_hash, ...userWithoutHash } = user;

    res.cookie('session', user.id, {
      signed: true,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json(userWithoutHash);
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/signout', (req, res) => {
  res.clearCookie('session');
  res.json({ success: true });
});

router.get('/me', authenticate, (req, res) => {
  const { pin_hash, ...userWithoutHash } = req.user;
  res.json(userWithoutHash);
});

export default router;
