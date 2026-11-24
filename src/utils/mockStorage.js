import { INITIAL_USERS, INITIAL_GATE_PASSES, INITIAL_SCAN_LOGS } from './mockData';
import { PASS_STATUS } from './constants';
import { computeValidUntil, parseDateTime } from './dateUtils';

const STORAGE_KEYS = {
  USERS: 'gatepass_users_v1',
  PASSES: 'gatepass_passes_v1',
  SCANS: 'gatepass_scans_v1',
  AUTH: 'gatepass_current_user_v1',
};

function createHttpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Initialize Storage with defaults if empty
export function initMockStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PASSES)) {
    localStorage.setItem(STORAGE_KEYS.PASSES, JSON.stringify(INITIAL_GATE_PASSES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SCANS)) {
    localStorage.setItem(STORAGE_KEYS.SCANS, JSON.stringify(INITIAL_SCAN_LOGS));
  }
}

// User Helpers
export function getUsers() {
  initMockStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

export function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export function getUserByEmailOrRoll(identifier) {
  const users = getUsers();
  const cleanId = identifier.trim().toLowerCase();
  return users.find(
    (u) =>
      u.email.toLowerCase() === cleanId ||
      u.rollNumber.toLowerCase() === cleanId
  );
}

export function addUser(user) {
  const users = getUsers();
  const cleanEmail = (user.email || '').trim().toLowerCase();
  const cleanRoll = (user.rollNumber || '').trim().toLowerCase();

  const duplicate = users.find(
    (u) =>
      (cleanEmail && u.email.toLowerCase() === cleanEmail) ||
      (cleanRoll && u.rollNumber.toLowerCase() === cleanRoll)
  );
  if (duplicate) {
    throw createHttpError('A user with this email or roll/staff number already exists.', 409);
  }

  const newUser = {
    ...user,
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    avatar: user.avatar && !user.avatar.includes('images.unsplash.com') ? user.avatar : '',
    active: true,
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

export function updateUserInStorage(id, updates) {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    throw createHttpError(`User with ID ${id} not found.`, 404);
  }

  const nextEmail = (updates.email ?? users[index].email).trim().toLowerCase();
  const nextRoll = (updates.rollNumber ?? users[index].rollNumber).trim().toLowerCase();
  const duplicate = users.find(
    (u) =>
      u.id !== id &&
      ((nextEmail && u.email.toLowerCase() === nextEmail) ||
        (nextRoll && u.rollNumber.toLowerCase() === nextRoll))
  );
  if (duplicate) {
    throw createHttpError('Another user already uses this email or roll/staff number.', 409);
  }

  users[index] = { ...users[index], ...updates };
  saveUsers(users);
  return users[index];
}

export function deleteUserInStorage(id) {
  const users = getUsers();
  const exists = users.some((u) => u.id === id);
  if (!exists) {
    throw createHttpError(`User with ID ${id} not found.`, 404);
  }
  const remaining = users.filter((u) => u.id !== id);
  saveUsers(remaining);
  return { success: true, id, message: 'User deleted successfully.' };
}

export function bulkCreateUsersInStorage(userList) {
  if (!Array.isArray(userList) || userList.length === 0) {
    throw createHttpError('Request body must include a non-empty users array.', 400);
  }

  const created = [];
  const errors = [];

  userList.forEach((userData, index) => {
    if (!userData?.name || !userData?.email || !userData?.rollNumber || !userData?.role) {
      errors.push({
        index,
        email: userData?.email || '',
        rollNumber: userData?.rollNumber || '',
        message: 'Missing required fields (name, email, rollNumber, role).',
      });
      return;
    }

    try {
      const createdUser = addUser(userData);
      created.push(createdUser);
    } catch (err) {
      errors.push({
        index,
        email: userData.email,
        rollNumber: userData.rollNumber,
        message: err.message || 'Duplicate or invalid user.',
      });
    }
  });

  if (created.length === 0) {
    throw createHttpError(errors[0]?.message || 'No users could be created.', 400);
  }

  return {
    success: true,
    createdCount: created.length,
    errorCount: errors.length,
    created,
    errors,
    message: `Created ${created.length} user(s)${errors.length > 0 ? `, ${errors.length} skipped` : ''}.`,
  };
}

export function toggleUserStatus(id) {
  const users = getUsers();
  const updated = users.map((u) => (u.id === id ? { ...u, active: !u.active } : u));
  saveUsers(updated);
  return updated;
}

// Gate Pass Helpers
export function getGatePasses() {
  initMockStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PASSES)) || INITIAL_GATE_PASSES;
  } catch {
    return INITIAL_GATE_PASSES;
  }
}

export function saveGatePasses(passes) {
  localStorage.setItem(STORAGE_KEYS.PASSES, JSON.stringify(passes));
}

export function getGatePassById(id) {
  const passes = getGatePasses();
  return passes.find((p) => p.id === id);
}

export function getGatePassByToken(token) {
  const passes = getGatePasses();
  return passes.find((p) => p.token === token);
}

export function lookupGatePasses(query) {
  const passes = getGatePasses();
  const trimmed = typeof query === 'string' ? query.trim().toLowerCase() : '';
  if (!trimmed) {
    const unreturned = passes.filter((p) => p.status === PASS_STATUS.USED && !p.returnedAt);
    const rest = passes.filter((p) => !(p.status === PASS_STATUS.USED && !p.returnedAt));
    return [...unreturned, ...rest].slice(0, 100);
  }
  return passes
    .filter(
      (p) =>
        p.id?.toLowerCase().includes(trimmed) ||
        p.token?.toLowerCase().includes(trimmed) ||
        p.rollNumber?.toLowerCase().includes(trimmed) ||
        p.studentName?.toLowerCase().includes(trimmed)
    )
    .slice(0, 30);
}

export function createGatePassRequest(passData, studentUser) {
  const exitDt = parseDateTime(passData.exitDate, passData.exitTime);
  const returnDt = parseDateTime(passData.returnDate, passData.returnTime);
  if (!exitDt || !returnDt) {
    throw createHttpError('Invalid exit or return date/time format.', 400);
  }
  if (returnDt.getTime() <= exitDt.getTime()) {
    throw createHttpError('Return date and time must be after the exit date and time.', 400);
  }

  const passes = getGatePasses();
  const newId = `GP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const token = `TOKEN-SXIET-${newId}-${studentUser.name.split(' ')[0].toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const newPass = {
    id: newId,
    studentId: studentUser.id,
    studentName: studentUser.name,
    rollNumber: studentUser.rollNumber,
    department: studentUser.department,
    semester: studentUser.semester || 'N/A',
    photo: studentUser.avatar || '',
    guardianContact: passData.guardianContact || studentUser.guardianContact || studentUser.mobile || '',
    reason: passData.reason,
    destination: passData.destination,
    exitDate: passData.exitDate,
    exitTime: passData.exitTime,
    returnDate: passData.returnDate,
    returnTime: passData.returnTime,
    isEmergency: !!passData.isEmergency,
    remarks: passData.remarks || '',
    status: PASS_STATUS.PENDING,
    token,
    createdAt: new Date().toISOString(),
    reviewedBy: null,
    reviewedAt: null,
    clerkRemarks: null,
    validUntil: computeValidUntil(passData.returnDate, passData.returnTime),
  };

  passes.unshift(newPass);
  saveGatePasses(passes);
  return newPass;
}

export function approveGatePass(id, clerkUser, clerkRemarks = '') {
  const passes = getGatePasses();
  const pass = passes.find((p) => p.id === id);
  if (!pass) throw createHttpError(`Gate Pass with ID ${id} not found.`, 404);
  if (pass.status !== PASS_STATUS.PENDING) {
    throw createHttpError(
      `Cannot approve pass with status '${pass.status}'. Only pending requests can be approved.`,
      400
    );
  }

  pass.status = PASS_STATUS.APPROVED;
  pass.reviewedBy = clerkUser ? `${clerkUser.name} (Clerk)` : 'Staff Clerk (Administration)';
  pass.reviewedAt = new Date().toISOString();
  pass.clerkRemarks = clerkRemarks || 'Approved via Portal';

  saveGatePasses(passes);
  return pass;
}

export function rejectGatePass(id, clerkUser, rejectionReason) {
  if (!rejectionReason || !rejectionReason.trim()) {
    throw createHttpError('A clear reason for rejection must be provided.', 400);
  }
  const passes = getGatePasses();
  const pass = passes.find((p) => p.id === id);
  if (!pass) throw createHttpError(`Gate Pass with ID ${id} not found.`, 404);
  if (pass.status !== PASS_STATUS.PENDING) {
    throw createHttpError(
      `Cannot reject pass with status '${pass.status}'. Only pending requests can be rejected.`,
      400
    );
  }

  pass.status = PASS_STATUS.REJECTED;
  pass.reviewedBy = clerkUser ? `${clerkUser.name} (Clerk)` : 'Staff Clerk (Administration)';
  pass.reviewedAt = new Date().toISOString();
  pass.rejectionReason = rejectionReason.trim();

  saveGatePasses(passes);
  return pass;
}

export function bulkGatePassAction({ ids, action, remarks, clerkRemarks, rejectionReason, clerkUser }) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw createHttpError('At least one gate pass ID must be selected.', 400);
  }
  if (action !== 'approve' && action !== 'reject') {
    throw createHttpError("Bulk action must be either 'approve' or 'reject'.", 400);
  }
  if (action === 'reject' && (!rejectionReason || !rejectionReason.trim())) {
    throw createHttpError('A rejection reason is required for bulk reject.', 400);
  }

  const updated = [];
  const skipped = [];

  for (const id of ids) {
    try {
      if (action === 'approve') {
        updated.push(approveGatePass(id, clerkUser, remarks ?? clerkRemarks ?? 'Approved via Bulk Action'));
      } else {
        updated.push(rejectGatePass(id, clerkUser, rejectionReason));
      }
    } catch (err) {
      skipped.push({ id, reason: err.message });
    }
  }

  return {
    success: true,
    updatedCount: updated.length,
    skippedCount: skipped.length,
    updated,
    skipped,
  };
}

export function markGatePassUsed(id) {
  const passes = getGatePasses();
  const pass = passes.find((p) => p.id === id);
  if (!pass) return null;

  pass.status = PASS_STATUS.USED;
  pass.usedAt = new Date().toISOString();
  saveGatePasses(passes);
  return { ...pass };
}

export function checkInGatePass({ passId, token, gate, guardUser, notes }) {
  if (!passId && !token) {
    throw createHttpError('Pass ID or QR token is required for return check-in.', 400);
  }

  const passes = getGatePasses();
  const pass = passes.find(
    (p) => (passId && p.id === String(passId).trim()) || (token && p.token === String(token).trim())
  );

  if (!pass) {
    throw createHttpError('Gate pass not found.', 404);
  }
  if (pass.returnedAt) {
    throw createHttpError('Student return check-in has already been recorded for this pass.', 400);
  }
  if (pass.status !== PASS_STATUS.USED) {
    throw createHttpError(
      `Cannot record return check-in for a pass with status '${pass.status}'. Only exited ('used') passes can be checked in.`,
      400
    );
  }

  const returnedAt = new Date().toISOString();
  const overdue = Boolean(pass.validUntil && new Date(pass.validUntil).getTime() < Date.now());
  pass.returnedAt = returnedAt;
  saveGatePasses(passes);

  const log = addScanLog({
    passId: pass.id,
    studentName: pass.studentName,
    rollNumber: pass.rollNumber,
    guardName: guardUser?.name || 'Gate Security',
    gate: gate || guardUser?.gate || 'Main Gate 1',
    result: 'VALID',
    scanType: 'entry',
    notes:
      notes ||
      (overdue
        ? 'Return Check-In Recorded (Late / Overdue)'
        : 'Return Check-In Recorded: Student Returned to Campus'),
  });

  return {
    success: true,
    isValid: true,
    overdue,
    pass: { ...pass },
    log,
  };
}

export function cancelGatePass(id) {
  const passes = getGatePasses();
  const pass = passes.find((p) => p.id === id);
  if (!pass) throw createHttpError(`Gate Pass with ID ${id} not found.`, 404);
  if (pass.status !== PASS_STATUS.PENDING) {
    throw createHttpError(
      `Cannot cancel a pass that is already ${pass.status}. Only pending requests can be cancelled.`,
      400
    );
  }

  pass.status = PASS_STATUS.CANCELLED;
  pass.cancelledAt = new Date().toISOString();
  saveGatePasses(passes);
  return pass;
}

export function updateStudentProfile(userId, profileData) {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return null;

  users[index] = { ...users[index], ...profileData };
  saveUsers(users);

  const storedAuth = getStoredAuthUser();
  if (storedAuth && storedAuth.id === userId) {
    setStoredAuthUser(users[index]);
  }
  return users[index];
}

// Scan Logs
export function getScanLogs() {
  initMockStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SCANS)) || INITIAL_SCAN_LOGS;
  } catch {
    return INITIAL_SCAN_LOGS;
  }
}

export function addScanLog(log) {
  const logs = getScanLogs();
  const newLog = {
    id: `scn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    scanTime: new Date().toISOString(),
    scanType: 'exit',
    ...log,
  };
  logs.unshift(newLog);
  localStorage.setItem(STORAGE_KEYS.SCANS, JSON.stringify(logs));
  return newLog;
}

export function getMockReports(days = 7) {
  const safeDays = Math.min(Math.max(Number(days) || 7, 1), 90);
  const passes = getGatePasses();
  const scans = getScanLogs();

  const today = new Date();
  const startDateObj = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (safeDays - 1)));
  const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
  const labelFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  const countByDate = new Map();
  for (const p of passes) {
    const key = (p.createdAt || '').slice(0, 10);
    if (key) {
      countByDate.set(key, (countByDate.get(key) || 0) + 1);
    }
  }

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

  const passDistribution = {
    approved: passes.filter((p) => p.status === PASS_STATUS.APPROVED).length,
    used: passes.filter((p) => p.status === PASS_STATUS.USED).length,
    rejected: passes.filter((p) => p.status === PASS_STATUS.REJECTED).length,
    pending: passes.filter((p) => p.status === PASS_STATUS.PENDING).length,
    cancelled: passes.filter((p) => p.status === PASS_STATUS.CANCELLED).length,
    expired: passes.filter((p) => p.status === PASS_STATUS.EXPIRED).length,
  };

  const deptMap = new Map();
  const destMap = new Map();
  for (const p of passes) {
    const dept = (p.department || 'Unspecified').trim() || 'Unspecified';
    deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
    const dest = (p.destination || 'Unspecified').trim() || 'Unspecified';
    destMap.set(dest, (destMap.get(dest) || 0) + 1);
  }

  const departmentBreakdown = [...deptMap.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  const topDestinations = [...destMap.entries()]
    .map(([destination, count]) => ({ destination, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    days: safeDays,
    dailyTrend,
    passDistribution,
    departmentBreakdown,
    topDestinations,
    scans,
  };
}

// Auth Storage Persistence
export function getStoredAuthUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH));
  } catch {
    return null;
  }
}

export function setStoredAuthUser(user) {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  }
}
