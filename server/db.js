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

  CREATE TABLE IF NOT EXISTS muted_dates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    reason TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_image TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS album_memories (
    album_id TEXT NOT NULL REFERENCES albums(id),
    memory_id TEXT NOT NULL REFERENCES memories(id),
    added_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (album_id, memory_id)
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    entry_date TEXT NOT NULL,
    content TEXT DEFAULT '',
    mood TEXT DEFAULT '',
    voice_note_path TEXT DEFAULT NULL,
    photo_path TEXT DEFAULT NULL,
    entry_type TEXT DEFAULT 'text',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, entry_date)
  );

  CREATE TABLE IF NOT EXISTS grace_days (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    used_date TEXT NOT NULL,
    month_year TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

try { db.exec("ALTER TABLE users ADD COLUMN active_skin TEXT DEFAULT 'heirloom';"); } catch(e){}
try { db.exec("ALTER TABLE users ADD COLUMN legacy_email TEXT DEFAULT '';"); } catch(e){}

try { db.exec('ALTER TABLE memories ADD COLUMN voice_note_path TEXT DEFAULT NULL;'); } catch (e) {}
try { db.exec('ALTER TABLE memories ADD COLUMN sealed_until TEXT DEFAULT NULL;'); } catch (e) {}
try { db.exec('ALTER TABLE memories ADD COLUMN gdrive_file_id TEXT DEFAULT NULL;'); } catch (e) {}
try { db.exec('ALTER TABLE memories ADD COLUMN gdrive_voice_file_id TEXT DEFAULT NULL;'); } catch (e) {}
try { db.exec('ALTER TABLE journal_entries ADD COLUMN gdrive_photo_id TEXT DEFAULT NULL;'); } catch (e) {}
try { db.exec('ALTER TABLE journal_entries ADD COLUMN gdrive_voice_id TEXT DEFAULT NULL;'); } catch (e) {}

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

export function createMemory({ id, userId, title, description, filePath, fileName, fileType, fileSize, voiceNotePath, sealedUntil, gdriveFileId, gdriveVoiceFileId }) {
  const stmt = db.prepare(`
    INSERT INTO memories (id, user_id, title, description, file_path, file_name, file_type, file_size, voice_note_path, sealed_until, gdrive_file_id, gdrive_voice_file_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, userId, title, description, filePath, fileName, fileType, fileSize, voiceNotePath || null, sealedUntil || null, gdriveFileId || null, gdriveVoiceFileId || null);
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

export function getMemoryByFilename(filename) {
  const stmt = db.prepare('SELECT * FROM memories WHERE file_path = ? OR voice_note_path = ?');
  const mem = stmt.get(filename, filename);
  if (mem) return mem;
  const stmtJ = db.prepare('SELECT * FROM journal_entries WHERE photo_path = ? OR voice_note_path = ?');
  return stmtJ.get(filename, filename) || null;
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

export function getWeeklyUploadUsage(userId) {
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(file_size), 0) as total_bytes
    FROM memories
    WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
  `);
  const result = stmt.get(userId);
  return result ? result.total_bytes : 0;
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

export function getOnThisDayMemories(userId) {
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  const currentYear = String(now.getFullYear());

  const stmt = db.prepare(`
    SELECT * FROM memories 
    WHERE user_id = ? 
    AND strftime('%m', created_at) = ? 
    AND strftime('%d', created_at) = ?
    AND strftime('%Y', created_at) != ?
    ORDER BY created_at DESC
  `);
  
  const memories = stmt.all(userId, currentMonth, currentDay, currentYear);
  const mutedDates = getMutedDates(userId);
  
  return memories.filter(memory => {
    const memDate = new Date(memory.created_at);
    const mMonth = memDate.getMonth() + 1;
    const mDay = memDate.getDate();
    return !mutedDates.some(md => md.month === mMonth && md.day === mDay);
  });
}

export function addMutedDate(id, userId, month, day, reason) {
  const stmt = db.prepare('INSERT INTO muted_dates (id, user_id, month, day, reason) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, userId, month, day, reason);
}

export function getMutedDates(userId) {
  const stmt = db.prepare('SELECT * FROM muted_dates WHERE user_id = ?');
  return stmt.all(userId);
}

export function removeMutedDate(id, userId) {
  const stmt = db.prepare('DELETE FROM muted_dates WHERE id = ? AND user_id = ?');
  stmt.run(id, userId);
}

export function createAlbum(id, userId, title, description) {
  const stmt = db.prepare('INSERT INTO albums (id, user_id, title, description) VALUES (?, ?, ?, ?)');
  stmt.run(id, userId, title, description);
  return getAlbumById(id, userId);
}

export function getAlbumsByUser(userId) {
  const stmt = db.prepare(`
    SELECT a.*, COUNT(am.memory_id) as memory_count
    FROM albums a
    LEFT JOIN album_memories am ON a.id = am.album_id
    WHERE a.user_id = ?
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);
  return stmt.all(userId);
}

export function getAlbumById(id, userId) {
  const stmt = db.prepare('SELECT * FROM albums WHERE id = ? AND user_id = ?');
  return stmt.get(id, userId) || null;
}

export function addMemoryToAlbum(albumId, memoryId) {
  const stmt = db.prepare('INSERT OR IGNORE INTO album_memories (album_id, memory_id) VALUES (?, ?)');
  stmt.run(albumId, memoryId);
}

export function removeMemoryFromAlbum(albumId, memoryId) {
  const stmt = db.prepare('DELETE FROM album_memories WHERE album_id = ? AND memory_id = ?');
  stmt.run(albumId, memoryId);
}

export function getMemoriesByAlbum(albumId, userId) {
  const stmt = db.prepare(`
    SELECT m.* 
    FROM memories m
    JOIN album_memories am ON m.id = am.memory_id
    JOIN albums a ON a.id = am.album_id
    WHERE am.album_id = ? AND a.user_id = ?
    ORDER BY am.added_at DESC
  `);
  return stmt.all(albumId, userId);
}

export function updateUserSettings(userId, skin, legacyEmail) {
  const stmt = db.prepare('UPDATE users SET active_skin = ?, legacy_email = ? WHERE id = ?');
  stmt.run(skin, legacyEmail, userId);
}

export function createOrUpdateJournalEntry(id, userId, entryDate, content, mood, voiceNotePath, photoPath, entryType, gdriveVoiceId, gdrivePhotoId) {
  // Check if entry exists for this date
  const existing = getJournalEntry(userId, entryDate);
  if (existing) {
    const stmt = db.prepare(`UPDATE journal_entries SET content = ?, mood = ?, voice_note_path = COALESCE(?, voice_note_path), photo_path = COALESCE(?, photo_path), entry_type = ?, gdrive_voice_id = COALESCE(?, gdrive_voice_id), gdrive_photo_id = COALESCE(?, gdrive_photo_id) WHERE user_id = ? AND entry_date = ?`);
    stmt.run(content, mood, voiceNotePath, photoPath, entryType, gdriveVoiceId || null, gdrivePhotoId || null, userId, entryDate);
    return getJournalEntry(userId, entryDate);
  }
  const stmt = db.prepare(`INSERT INTO journal_entries (id, user_id, entry_date, content, mood, voice_note_path, photo_path, entry_type, gdrive_voice_id, gdrive_photo_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt.run(id, userId, entryDate, content, mood, voiceNotePath || null, photoPath || null, entryType, gdriveVoiceId || null, gdrivePhotoId || null);
  return getJournalEntry(userId, entryDate);
}

export function getJournalEntry(userId, entryDate) {
  const stmt = db.prepare('SELECT * FROM journal_entries WHERE user_id = ? AND entry_date = ?');
  return stmt.get(userId, entryDate) || null;
}

export function getJournalMonth(userId, year, month) {
  const monthStr = String(month).padStart(2, '0');
  const stmt = db.prepare(`SELECT * FROM journal_entries WHERE user_id = ? AND entry_date LIKE ? ORDER BY entry_date ASC`);
  return stmt.all(userId, `${year}-${monthStr}-%`);
}

export function calculateStreak(userId) {
  // Get all unique dates with activity (memories + journal entries)
  const stmt = db.prepare(`
    SELECT DISTINCT date(created_at) as activity_date FROM memories WHERE user_id = ?
    UNION
    SELECT DISTINCT entry_date as activity_date FROM journal_entries WHERE user_id = ?
    ORDER BY activity_date DESC
  `);
  const dates = stmt.all(userId, userId).map(r => r.activity_date);
  
  // Get grace days for current month
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const graceDaysUsed = getGraceDaysUsed(userId, monthYear);
  const graceDaysRemaining = Math.max(0, 2 - graceDaysUsed.length);
  
  if (dates.length === 0) return { current: 0, longest: 0, graceDaysRemaining };
  
  // Calculate current streak
  let currentStreak = 0;
  let today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if today or yesterday has an entry (streak can include today)
  let checkDate = new Date(today);
  
  for (let i = 0; i < 400; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (dates.includes(dateStr)) {
      currentStreak++;
    } else {
      // Check if a grace day covers this
      const isGraced = graceDaysUsed.some(g => g.used_date === dateStr);
      if (isGraced) {
        currentStreak++;
      } else if (i === 0) {
        // Today doesn't have an entry yet, that's OK, check from yesterday
      } else {
        break;
      }
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  // Calculate longest streak (simplified)
  let longest = currentStreak;
  let tempStreak = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) { tempStreak = 1; continue; }
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = Math.round((prev - curr) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) {
      tempStreak++;
    } else {
      if (tempStreak > longest) longest = tempStreak;
      tempStreak = 1;
    }
  }
  if (tempStreak > longest) longest = tempStreak;
  
  return { current: currentStreak, longest, graceDaysRemaining };
}

export function getGraceDaysUsed(userId, monthYear) {
  const stmt = db.prepare('SELECT * FROM grace_days WHERE user_id = ? AND month_year = ?');
  return stmt.all(userId, monthYear);
}

export function useGraceDay(id, userId, usedDate, monthYear) {
  const stmt = db.prepare('INSERT OR IGNORE INTO grace_days (id, user_id, used_date, month_year) VALUES (?, ?, ?, ?)');
  stmt.run(id, userId, usedDate, monthYear);
}
