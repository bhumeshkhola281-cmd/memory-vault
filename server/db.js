import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;

const dbPath = path.join(dataDir, 'memoryvault.db');
const db = new DatabaseSync(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    last_upload_at TEXT
  );

  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    endpoint TEXT NOT NULL UNIQUE,
    keys_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export function createUser(id, name, pinHash) {
  const stmt = db.prepare('INSERT INTO users (id, name, pin_hash) VALUES (?, ?, ?)');
  stmt.run(id, name, pinHash);
  return findUserById(id);
}

export function findUserByName(name) {
  const stmt = db.prepare('SELECT * FROM users WHERE name = ?');
  return stmt.get(name) || null;
}

export function findUserById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) || null;
}

export function createMemory({ id, userId, title, description, filePath, fileName, fileType, fileSize }) {
  const stmt = db.prepare(`
    INSERT INTO memories (id, user_id, title, description, file_path, file_name, file_type, file_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, userId, title, description, filePath, fileName, fileType, fileSize);
  return getMemoryById(id);
}

export function getMemoriesByUser(userId, page = 1, limit = 20, type = null, search = null) {
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM memories WHERE user_id = ?';
  let countQuery = 'SELECT COUNT(*) as total FROM memories WHERE user_id = ?';
  const params = [userId];

  if (type) {
    query += ' AND file_type LIKE ?';
    countQuery += ' AND file_type LIKE ?';
    params.push(`${type}%`);
  }

  if (search) {
    query += ' AND title LIKE ?';
    countQuery += ' AND title LIKE ?';
    params.push(`%${search}%`);
  }

  const countParams = [...params];

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

  const memoriesStmt = db.prepare(query);
  const countStmt = db.prepare(countQuery);

  const memories = memoriesStmt.all(...params, limit, offset);
  const countResult = countStmt.get(...countParams);
  const total = countResult ? countResult.total : 0;

  return { memories, total };
}

export function getMemoryById(id) {
  const stmt = db.prepare('SELECT * FROM memories WHERE id = ?');
  return stmt.get(id) || null;
}

export function deleteMemory(id) {
  const stmt = db.prepare('DELETE FROM memories WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function updateLastUpload(userId) {
  const stmt = db.prepare("UPDATE users SET last_upload_at = datetime('now') WHERE id = ?");
  stmt.run(userId);
}

export function getUsersWithoutRecentUpload(days = 7) {
  const stmt = db.prepare(`
    SELECT * FROM users
    WHERE last_upload_at IS NULL OR julianday('now') - julianday(last_upload_at) >= ?
  `);
  return stmt.all(days);
}

export function savePushSubscription(id, userId, endpoint, keysJson) {
  // Use INSERT OR REPLACE for upsert behavior
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO push_subscriptions (id, user_id, endpoint, keys_json)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, userId, endpoint, keysJson);
  const getStmt = db.prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?');
  return getStmt.get(endpoint);
}

export function getPushSubscriptionsByUser(userId) {
  const stmt = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?');
  return stmt.all(userId);
}

export function deletePushSubscription(endpoint) {
  const stmt = db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?');
  const result = stmt.run(endpoint);
  return result.changes > 0;
}

export function getAllPushSubscriptions() {
  const stmt = db.prepare(`
    SELECT p.*, u.name as user_name, u.last_upload_at 
    FROM push_subscriptions p
    JOIN users u ON p.user_id = u.id
  `);
  return stmt.all();
}
