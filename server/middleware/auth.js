import { findUserById } from '../db.js';

export function authenticate(req, res, next) {
  const userId = req.signedCookies.session;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: No valid session' });
  }

  const user = findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User not found' });
  }

  req.user = user;
  next();
}
