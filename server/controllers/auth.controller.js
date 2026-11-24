import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbService, formatUser } from '../config/db.js';
import { config } from '../config/env.js';

export const authController = {
  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { identifier, password, roleHint } = req.body;

      if (!identifier && !roleHint) {
        return res.status(400).json({
          success: false,
          message: 'Please provide email or roll number to log in.',
        });
      }

      let userRow = identifier ? dbService.getUserByEmailOrRoll(identifier) : null;

      // Role hint fallback only when no identifier was explicitly supplied
      if (!identifier && !userRow && roleHint) {
        const users = dbService.getUsersByRole(roleHint);
        const activeUser = users.find((u) => u.active) || users[0];
        if (activeUser) {
          userRow = dbService.getUserAuthById(activeUser.id);
        }
      }

      if (!userRow) {
        return res.status(404).json({
          success: false,
          message: 'Invalid credentials. No user account found with provided details.',
        });
      }

      if (!userRow.active) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated by administration.',
        });
      }

      // Check password (allow bcrypt match, default 'password123', or demo credentials)
      const isPasswordValid =
        password === 'password123' ||
        (password && bcrypt.compareSync(password, userRow.password_hash)) ||
        (!password && roleHint); // demo switcher allow

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password. Please verify your credentials and try again.',
        });
      }

      const formatted = formatUser(userRow);

      // Generate signed JWT
      const token = jwt.sign(
        {
          id: formatted.id,
          email: formatted.email,
          rollNumber: formatted.rollNumber,
          role: formatted.role,
          name: formatted.name,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: formatted,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/auth/me
  async getMe(req, res) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    // Return both direct object and structured payload for frontend compatibility
    res.status(200).json({
      success: true,
      user: req.user,
      ...req.user,
    });
  },

  // POST /api/auth/logout
  async logout(req, res) {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  },

  // POST /api/auth/demo-switch
  async demoSwitch(req, res, next) {
    try {
      const { role } = req.body;
      const users = dbService.getUsersByRole(role || 'student');
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: `No user found for role ${role}` });
      }

      const user = users.find((u) => u.active);
      if (!user) {
        return res.status(403).json({
          success: false,
          message: `All ${role || 'student'} accounts are currently deactivated.`,
        });
      }
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          rollNumber: user.rollNumber,
          role: user.role,
          name: user.name,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      res.status(200).json({
        success: true,
        token,
        user,
      });
    } catch (err) {
      next(err);
    }
  },
};
