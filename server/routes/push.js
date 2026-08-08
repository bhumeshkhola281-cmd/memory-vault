import express from 'express';
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { savePushSubscription, deletePushSubscription } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..');

const router = express.Router();

const vapidKeysPath = path.join(dataDir, 'vapid-keys.json');

let vapidKeys;
if (fs.existsSync(vapidKeysPath)) {
  vapidKeys = JSON.parse(fs.readFileSync(vapidKeysPath, 'utf-8'));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(vapidKeysPath, JSON.stringify(vapidKeys));
}

webpush.setVapidDetails(
  'mailto:memoryvault@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

router.post('/subscribe', authenticate, (req, res) => {
  try {
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    savePushSubscription(
      uuidv4(),
      req.user.id,
      subscription.endpoint,
      JSON.stringify(subscription)
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/unsubscribe', authenticate, (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    deletePushSubscription(endpoint);
    res.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
