import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { INITIAL_USERS, INITIAL_GATE_PASSES, INITIAL_SCAN_LOGS } from '../data/seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = Boolean(process.env.VERCEL);
const defaultDataDir = isVercel
  ? path.resolve('/tmp', 'gatepass-data')
  : path.resolve(__dirname, '../data');
const dbPath = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.resolve(defaultDataDir, 'gatepass.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for high performance & reliability
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    roll_number TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT,
    semester TEXT,
    mobile TEXT,
    hostel_room TEXT,
    guardian_contact TEXT,
    avatar TEXT,
    gate TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS gate_passes (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    department TEXT NOT NULL,
    semester TEXT,
    photo TEXT,
    guardian_contact TEXT,
    reason TEXT NOT NULL,
    destination TEXT NOT NULL,
    exit_date TEXT NOT NULL,
    exit_time TEXT NOT NULL,
    return_date TEXT NOT NULL,
    return_time TEXT NOT NULL,
    is_emergency INTEGER DEFAULT 0,
    remarks TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    reviewed_by TEXT,
    reviewed_at TEXT,
    clerk_remarks TEXT,
    rejection_reason TEXT,
    valid_until TEXT,
    cancelled_at TEXT,
    used_at TEXT,
    returned_at TEXT
  );

  CREATE TABLE IF NOT EXISTS scan_logs (
    id TEXT PRIMARY KEY,
    pass_id TEXT,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    scan_time TEXT NOT NULL,
    guard_name TEXT NOT NULL,
    gate TEXT NOT NULL,
    result TEXT NOT NULL,
    scan_type TEXT DEFAULT 'exit',
    notes TEXT
  );
`);

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((col) => col.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function runMigrations() {
  ensureColumn('users', 'hostel_room', 'TEXT');
  ensureColumn('users', 'guardian_contact', 'TEXT');
  ensureColumn('gate_passes', 'guardian_contact', 'TEXT');
  ensureColumn('gate_passes', 'returned_at', 'TEXT');
  ensureColumn('scan_logs', 'scan_type', "TEXT DEFAULT 'exit'");

  // Strip legacy external Unsplash URLs so local/offline avatar initials render cleanly
  db.exec(`
    UPDATE users SET avatar = '' WHERE avatar LIKE 'https://images.unsplash.com/%';
    UPDATE gate_passes SET photo = '' WHERE photo LIKE 'https://images.unsplash.com/%';
  `);
}

runMigrations();

export function parseDateTime(dateString, timeString) {
  if (!dateString || typeof dateString !== 'string') return null;
  const dateMatch = dateString.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  let hour = 23;
  let minute = 59;
  let second = 59;

  if (timeString && typeof timeString === 'string' && timeString.trim()) {
    const cleanTime = timeString.trim();
    const match12h = cleanTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    const match24h = cleanTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

    if (match12h) {
      hour = Number(match12h[1]);
      minute = Number(match12h[2]);
      second = Number(match12h[3] || 0);
      const meridiem = match12h[4].toUpperCase();
      if (hour < 1 || hour > 12 || minute < 0 || minute > 59 || second < 0 || second > 59) {
        return null;
      }
      if (meridiem === 'PM' && hour < 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;
    } else if (match24h) {
      hour = Number(match24h[1]);
      minute = Number(match24h[2]);
      second = Number(match24h[3] || 0);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
        return null;
      }
    } else {
      return null;
    }
  }

  const parsed = new Date(year, month - 1, day, hour, minute, second, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function computeValidUntil(returnDate, returnTime) {
  const parsed = parseDateTime(returnDate, returnTime);
  return parsed ? parsed.toISOString() : null;
}

// Transform row to Frontend Model Object (camelCase)
export function formatUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    rollNumber: row.roll_number,
    name: row.name,
    role: row.role,
    department: row.department || '',
    semester: row.semester || '',
    mobile: row.mobile || '',
    hostelRoom: row.hostel_room || '',
    guardianContact: row.guardian_contact || '',
    avatar: row.avatar || '',
    gate: row.gate || null,
    active: Boolean(row.active),
    createdAt: row.created_at,
  };
}

export function formatPass(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    rollNumber: row.roll_number,
    department: row.department,
    semester: row.semester || '',
    photo: row.photo || '',
    guardianContact: row.guardian_contact || '',
    reason: row.reason,
    destination: row.destination,
    exitDate: row.exit_date,
    exitTime: row.exit_time,
    returnDate: row.return_date,
    returnTime: row.return_time,
    isEmergency: Boolean(row.is_emergency),
    remarks: row.remarks || '',
    status: row.status,
    token: row.token,
    createdAt: row.created_at,
    reviewedBy: row.reviewed_by || null,
    reviewedAt: row.reviewed_at || null,
    clerkRemarks: row.clerk_remarks || null,
    rejectionReason: row.rejection_reason || null,
    validUntil: row.valid_until || null,
    cancelledAt: row.cancelled_at || null,
    usedAt: row.used_at || null,
    returnedAt: row.returned_at || null,
  };
}

export function formatScanLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    passId: row.pass_id,
    studentName: row.student_name,
    rollNumber: row.roll_number,
    scanTime: row.scan_time,
    guardName: row.guard_name,
    gate: row.gate,
    result: row.result,
    scanType: row.scan_type || 'exit',
    notes: row.notes,
  };
}

// Seed Database if empty
function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('[DB] Seeding initial users...');
    const defaultHash = bcrypt.hashSync('password123', 8);
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, email, roll_number, password_hash, name, role, department, semester,
        mobile, hostel_room, guardian_contact, avatar, gate, active, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const u of INITIAL_USERS) {
      insertUser.run(
        u.id,
        u.email,
        u.rollNumber,
        defaultHash,
        u.name,
        u.role,
        u.department || '',
        u.semester || '',
        u.mobile || '',
        u.hostelRoom || '',
        u.guardianContact || '',
        u.avatar || '',
        u.gate || null,
        u.active ? 1 : 0,
        new Date().toISOString()
      );
    }
  }

  const passCount = db.prepare('SELECT COUNT(*) as count FROM gate_passes').get().count;
  if (passCount === 0) {
    console.log('[DB] Seeding initial gate passes...');
    const insertPass = db.prepare(`
      INSERT INTO gate_passes (
        id, student_id, student_name, roll_number, department, semester, photo, guardian_contact,
        reason, destination, exit_date, exit_time, return_date, return_time,
        is_emergency, remarks, status, token, created_at, reviewed_by, reviewed_at,
        clerk_remarks, rejection_reason, valid_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of INITIAL_GATE_PASSES) {
      insertPass.run(
        p.id,
        p.studentId,
        p.studentName,
        p.rollNumber,
        p.department,
        p.semester || '',
        p.photo || '',
        p.guardianContact || '',
        p.reason,
        p.destination,
        p.exitDate,
        p.exitTime,
        p.returnDate,
        p.returnTime,
        p.isEmergency ? 1 : 0,
        p.remarks || '',
        p.status,
        p.token,
        p.createdAt,
        p.reviewedBy || null,
        p.reviewedAt || null,
        p.clerkRemarks || null,
        p.rejectionReason || null,
        p.validUntil || null
      );
    }
  }

  const scanCount = db.prepare('SELECT COUNT(*) as count FROM scan_logs').get().count;
  if (scanCount === 0) {
    console.log('[DB] Seeding initial scan logs...');
    const insertScan = db.prepare(`
      INSERT INTO scan_logs (id, pass_id, student_name, roll_number, scan_time, guard_name, gate, result, scan_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const s of INITIAL_SCAN_LOGS) {
      insertScan.run(
        s.id,
        s.passId,
        s.studentName,
        s.rollNumber,
        s.scanTime,
        s.guardName,
        s.gate,
        s.result,
        s.scanType || 'exit',
        s.notes
      );
    }
  }
}

// Run initial seed
seedDatabase();

// -------------------------------------------------------------
// DAO Functions
// -------------------------------------------------------------

export const dbService = {
  // USER METHODS
  getUserById(id) {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return formatUser(row);
  },

  getUserAuthById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  getUserByEmailOrRoll(identifier) {
    const clean = identifier.trim().toLowerCase();
    const row = db.prepare(`
      SELECT * FROM users
      WHERE LOWER(email) = ? OR LOWER(roll_number) = ?
    `).get(clean, clean);
    return row;
  },

  findConflictUser({ email, rollNumber, excludeId = null }) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanRoll = rollNumber ? rollNumber.trim().toLowerCase() : '';
    if (!cleanEmail && !cleanRoll) return null;

    if (excludeId) {
      return db
        .prepare(`
          SELECT * FROM users
          WHERE id != ? AND (LOWER(email) = ? OR LOWER(roll_number) = ?)
          LIMIT 1
        `)
        .get(excludeId, cleanEmail, cleanRoll);
    }

    return db
      .prepare(`
        SELECT * FROM users
        WHERE LOWER(email) = ? OR LOWER(roll_number) = ?
        LIMIT 1
      `)
      .get(cleanEmail, cleanRoll);
  },

  getAllUsers() {
    const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    return rows.map(formatUser);
  },

  getUsersByRole(role) {
    const rows = db.prepare('SELECT * FROM users WHERE role = ? ORDER BY name ASC').all(role);
    return rows.map(formatUser);
  },

  createUser(userData) {
    const id = userData.id || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const passwordHash = userData.password
      ? bcrypt.hashSync(userData.password, 8)
      : bcrypt.hashSync('password123', 8);

    db.prepare(`
      INSERT INTO users (
        id, email, roll_number, password_hash, name, role, department, semester,
        mobile, hostel_room, guardian_contact, avatar, gate, active, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userData.email.trim(),
      userData.rollNumber.trim(),
      passwordHash,
      userData.name.trim(),
      userData.role,
      userData.department || '',
      userData.semester || '',
      userData.mobile || '',
      userData.hostelRoom || '',
      userData.guardianContact || '',
      userData.avatar || '',
      userData.gate || null,
      userData.active !== false ? 1 : 0,
      new Date().toISOString()
    );

    return this.getUserById(id);
  },

  updateUser(id, updates) {
    const current = this.getUserAuthById(id);
    if (!current) return null;

    const nextName = updates.name !== undefined ? String(updates.name).trim() : current.name;
    const nextEmail = updates.email !== undefined ? String(updates.email).trim() : current.email;
    const nextRoll = updates.rollNumber !== undefined ? String(updates.rollNumber).trim() : current.roll_number;
    const nextRole = updates.role !== undefined ? updates.role : current.role;
    const nextDepartment = updates.department !== undefined ? updates.department : (current.department || '');
    const nextSemester = updates.semester !== undefined ? updates.semester : (current.semester || '');
    const nextMobile = updates.mobile !== undefined ? updates.mobile : (current.mobile || '');
    const nextHostelRoom = updates.hostelRoom !== undefined ? updates.hostelRoom : (current.hostel_room || '');
    const nextGuardianContact = updates.guardianContact !== undefined ? updates.guardianContact : (current.guardian_contact || '');
    const nextAvatar = updates.avatar !== undefined ? updates.avatar : (current.avatar || '');
    const nextGate = updates.gate !== undefined ? updates.gate : current.gate;
    const nextActive = updates.active !== undefined ? (updates.active ? 1 : 0) : current.active;
    const nextPasswordHash =
      updates.password && String(updates.password).trim()
        ? bcrypt.hashSync(String(updates.password).trim(), 8)
        : current.password_hash;

    db.prepare(`
      UPDATE users SET
        name = ?,
        email = ?,
        roll_number = ?,
        role = ?,
        department = ?,
        semester = ?,
        mobile = ?,
        hostel_room = ?,
        guardian_contact = ?,
        avatar = ?,
        gate = ?,
        active = ?,
        password_hash = ?
      WHERE id = ?
    `).run(
      nextName,
      nextEmail,
      nextRoll,
      nextRole,
      nextDepartment,
      nextSemester,
      nextMobile,
      nextHostelRoom,
      nextGuardianContact,
      nextAvatar,
      nextGate,
      nextActive,
      nextPasswordHash,
      id
    );

    return this.getUserById(id);
  },

  deleteUser(id) {
    const current = this.getUserById(id);
    if (!current) return null;
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return current;
  },

  toggleUserStatus(id) {
    const current = this.getUserById(id);
    if (!current) return null;

    const newActive = current.active ? 0 : 1;
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(newActive, id);
    return this.getUserById(id);
  },

  // GATE PASS METHODS
  getAllPasses() {
    const rows = db.prepare('SELECT * FROM gate_passes ORDER BY created_at DESC').all();
    return rows.map(formatPass);
  },

  getPassById(id) {
    const row = db.prepare('SELECT * FROM gate_passes WHERE id = ?').get(id);
    return formatPass(row);
  },

  getPassByToken(token) {
    const row = db.prepare('SELECT * FROM gate_passes WHERE token = ?').get(token);
    return formatPass(row);
  },

  getPassesByStudentId(studentId) {
    const rows = db.prepare(`
      SELECT * FROM gate_passes
      WHERE student_id = ?
      ORDER BY created_at DESC
    `).all(studentId);
    return rows.map(formatPass);
  },

  getPendingPasses() {
    const rows = db.prepare(`
      SELECT * FROM gate_passes
      WHERE status = 'pending'
      ORDER BY is_emergency DESC, created_at DESC
    `).all();
    return rows.map(formatPass);
  },

  lookupPasses(query) {
    const trimmed = typeof query === 'string' ? query.trim() : '';
    if (!trimmed) {
      const rows = db.prepare(`
        SELECT * FROM gate_passes
        ORDER BY
          CASE WHEN status = 'used' AND (returned_at IS NULL OR returned_at = '') THEN 0 ELSE 1 END,
          created_at DESC
        LIMIT 100
      `).all();
      return rows.map(formatPass);
    }

    const pattern = `%${trimmed.toLowerCase()}%`;
    const rows = db.prepare(`
      SELECT * FROM gate_passes
      WHERE LOWER(id) LIKE ?
         OR LOWER(token) LIKE ?
         OR LOWER(roll_number) LIKE ?
         OR LOWER(student_name) LIKE ?
      ORDER BY created_at DESC
      LIMIT 30
    `).all(pattern, pattern, pattern, pattern);
    return rows.map(formatPass);
  },

  createPass(passData, studentUser) {
    const id = `GP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const studentFirstName = (studentUser.name || 'STUDENT').split(' ')[0].toUpperCase();
    const token = `TOKEN-SXIET-${id}-${studentFirstName}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const createdAt = new Date().toISOString();
    const validUntil = computeValidUntil(passData.returnDate, passData.returnTime);
    const guardianContact = passData.guardianContact || studentUser.guardianContact || studentUser.mobile || '';

    db.prepare(`
      INSERT INTO gate_passes (
        id, student_id, student_name, roll_number, department, semester, photo, guardian_contact,
        reason, destination, exit_date, exit_time, return_date, return_time,
        is_emergency, remarks, status, token, created_at, valid_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      studentUser.id,
      studentUser.name,
      studentUser.rollNumber,
      studentUser.department,
      studentUser.semester || '',
      studentUser.avatar || '',
      guardianContact,
      passData.reason,
      passData.destination,
      passData.exitDate,
      passData.exitTime,
      passData.returnDate,
      passData.returnTime,
      passData.isEmergency ? 1 : 0,
      passData.remarks || '',
      'pending',
      token,
      createdAt,
      validUntil
    );

    return this.getPassById(id);
  },

  approvePass(id, reviewerName, clerkRemarks = '') {
    const reviewedAt = new Date().toISOString();
    db.prepare(`
      UPDATE gate_passes SET
        status = 'approved',
        reviewed_by = ?,
        reviewed_at = ?,
        clerk_remarks = ?
      WHERE id = ?
    `).run(reviewerName, reviewedAt, clerkRemarks, id);

    return this.getPassById(id);
  },

  rejectPass(id, reviewerName, rejectionReason = '') {
    const reviewedAt = new Date().toISOString();
    db.prepare(`
      UPDATE gate_passes SET
        status = 'rejected',
        reviewed_by = ?,
        reviewed_at = ?,
        rejection_reason = ?
      WHERE id = ?
    `).run(reviewerName, reviewedAt, rejectionReason, id);

    return this.getPassById(id);
  },

  markPassUsed(id) {
    const usedAt = new Date().toISOString();
    db.prepare(`
      UPDATE gate_passes SET
        status = 'used',
        used_at = ?
      WHERE id = ?
    `).run(usedAt, id);

    return this.getPassById(id);
  },

  recordPassCheckIn(id, returnedAt = new Date().toISOString()) {
    db.prepare(`
      UPDATE gate_passes SET
        returned_at = ?
      WHERE id = ?
    `).run(returnedAt, id);

    return this.getPassById(id);
  },

  cancelPass(id) {
    const cancelledAt = new Date().toISOString();
    db.prepare(`
      UPDATE gate_passes SET
        status = 'cancelled',
        cancelled_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(cancelledAt, id);

    return this.getPassById(id);
  },

  // SCAN LOG METHODS
  getAllScanLogs() {
    const rows = db.prepare('SELECT * FROM scan_logs ORDER BY scan_time DESC').all();
    return rows.map(formatScanLog);
  },

  createScanLog(log) {
    const id = `scn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const scanTime = new Date().toISOString();

    db.prepare(`
      INSERT INTO scan_logs (id, pass_id, student_name, roll_number, scan_time, guard_name, gate, result, scan_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      log.passId || 'N/A',
      log.studentName || 'Unknown',
      log.rollNumber || 'UNKNOWN',
      scanTime,
      log.guardName || 'Security Guard',
      log.gate || 'Main Gate 1',
      log.result || 'INVALID',
      log.scanType || 'exit',
      log.notes || ''
    );

    const row = db.prepare('SELECT * FROM scan_logs WHERE id = ?').get(id);
    return formatScanLog(row);
  },

  // REPORTS / ANALYTICS SQL AGGREGATES
  getReports(days = 7) {
    const safeDays = Math.min(Math.max(Number(days) || 7, 1), 90);
    const today = new Date();
    const startDateObj = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (safeDays - 1)));
    const startDateIso = startDateObj.toISOString().slice(0, 10);

    const dailyRows = db.prepare(`
      SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS count
      FROM gate_passes
      WHERE substr(created_at, 1, 10) >= ?
      GROUP BY substr(created_at, 1, 10)
      ORDER BY date ASC
    `).all(startDateIso);

    const countByDate = new Map(dailyRows.map((row) => [row.date, Number(row.count) || 0]));
    const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
    const labelFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

    const dailyTrend = [];
    for (let i = 0; i < safeDays; i += 1) {
      const d = new Date(startDateObj.getTime() + i * 86400000);
      const isoDate = d.toISOString().slice(0, 10);
      dailyTrend.push({
        date: isoDate,
        day: safeDays <= 7 ? weekdayFmt.format(d) : labelFmt.format(d),
        label: labelFmt.format(d),
        count: countByDate.get(isoDate) || 0,
      });
    }

    const statusRows = db.prepare(`
      SELECT LOWER(status) AS status, COUNT(*) AS count
      FROM gate_passes
      GROUP BY LOWER(status)
    `).all();

    const passDistribution = {
      approved: 0,
      used: 0,
      rejected: 0,
      pending: 0,
      cancelled: 0,
      expired: 0,
    };
    for (const row of statusRows) {
      if (row.status in passDistribution) {
        passDistribution[row.status] = Number(row.count) || 0;
      }
    }

    const departmentBreakdown = db.prepare(`
      SELECT COALESCE(NULLIF(TRIM(department), ''), 'Unspecified') AS department, COUNT(*) AS count
      FROM gate_passes
      GROUP BY COALESCE(NULLIF(TRIM(department), ''), 'Unspecified')
      ORDER BY count DESC
    `).all().map((row) => ({
      department: row.department,
      count: Number(row.count) || 0,
    }));

    const topDestinations = db.prepare(`
      SELECT COALESCE(NULLIF(TRIM(destination), ''), 'Unspecified') AS destination, COUNT(*) AS count
      FROM gate_passes
      GROUP BY COALESCE(NULLIF(TRIM(destination), ''), 'Unspecified')
      ORDER BY count DESC
      LIMIT 8
    `).all().map((row) => ({
      destination: row.destination,
      count: Number(row.count) || 0,
    }));

    const scanRows = db.prepare(`
      SELECT * FROM scan_logs
      ORDER BY scan_time DESC
      LIMIT 100
    `).all();

    return {
      days: safeDays,
      dailyTrend,
      passDistribution,
      departmentBreakdown,
      topDestinations,
      scans: scanRows.map(formatScanLog),
    };
  },
};

export default db;
