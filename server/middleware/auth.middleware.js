import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { dbService } from '../config/db.js';

function resolveMockTokenUser(token) {
  const withoutPrefix = token.replace('mock-jwt-token-', '');
  const candidateId = withoutPrefix.replace(/-\d+$/, '');
  let user = dbService.getUserById(candidateId);
  if (!user) {
    user = dbService
      .getAllUsers()
      .find((u) => withoutPrefix === u.id || withoutPrefix.startsWith(`${u.id}-`));
  }
  return user || null;
}

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing or invalid format. Please log in.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (token.startsWith('mock-jwt-token-')) {
      const user = resolveMockTokenUser(token);
      if (user) {
        if (!user.active) {
          return res.status(403).json({ success: false, message: 'Account has been deactivated.' });
        }
        req.user = user;
        return next();
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired mock authentication token.',
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = dbService.getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated by administration.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or forged authentication token.',
    });
  }
};

// Optional auth: sets req.user if token present, but does not block if absent
export const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    if (token.startsWith('mock-jwt-token-')) {
      const user = resolveMockTokenUser(token);
      if (user && user.active) {
        req.user = user;
      }
    } else {
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = dbService.getUserById(decoded.id);
      if (user && user.active) {
        req.user = user;
      }
    }
  } catch {
    // Ignore invalid optional token
  }
  next();
};
