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

export function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTime(timeString) {
  if (!timeString) return '-';
  if (timeString.includes('T')) {
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    }
  }

  const match24h = String(timeString).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24h) {
    const hour24 = Number(match24h[1]);
    const minute = match24h[2];
    if (hour24 >= 0 && hour24 <= 23) {
      const meridiem = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = hour24 % 12 || 12;
      return `${String(hour12).padStart(2, '0')}:${minute} ${meridiem}`;
    }
  }

  return timeString;
}

export function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '-';
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return dateTimeString;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function isPassExpired(validUntil) {
  if (!validUntil) return false;
  const expiry = new Date(validUntil);
  return expiry.getTime() < Date.now();
}
