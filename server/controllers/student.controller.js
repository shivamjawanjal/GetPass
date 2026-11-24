import { dbService, parseDateTime } from '../config/db.js';

export const studentController = {
  // GET /api/student/requests
  async getMyRequests(req, res, next) {
    try {
      const studentId =
        req.user?.role === 'student'
          ? req.user.id
          : req.query.studentId || req.user?.id;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'Student identifier is required.',
        });
      }

      const passes = dbService.getPassesByStudentId(studentId);
      res.status(200).json(passes);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/student/requests
  async createRequest(req, res, next) {
    try {
      const passData = req.body;
      const student =
        req.user ||
        req.body.studentUser ||
        (passData.studentId ? dbService.getUserById(passData.studentId) : null);

      if (!student) {
        return res.status(400).json({
          success: false,
          message: 'Student record could not be identified for this pass request.',
        });
      }

      if (!passData.reason || !passData.destination) {
        return res.status(400).json({
          success: false,
          message: 'Reason and destination are required fields.',
        });
      }

      if (!passData.exitDate || !passData.exitTime || !passData.returnDate || !passData.returnTime) {
        return res.status(400).json({
          success: false,
          message: 'Complete exit and return schedule must be specified.',
        });
      }

      const exitDt = parseDateTime(passData.exitDate, passData.exitTime);
      const returnDt = parseDateTime(passData.returnDate, passData.returnTime);

      if (!exitDt || !returnDt) {
        return res.status(400).json({
          success: false,
          message: 'Invalid exit or return date/time format.',
        });
      }

      if (returnDt.getTime() <= exitDt.getTime()) {
        return res.status(400).json({
          success: false,
          message: 'Return date and time must be after the exit date and time.',
        });
      }

      const createdPass = dbService.createPass(passData, student);
      res.status(201).json(createdPass);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/student/requests/:id
  async getPassDetails(req, res, next) {
    try {
      const { id } = req.params;
      const pass = dbService.getPassById(id);

      if (!pass) {
        return res.status(404).json({
          success: false,
          message: `Gate Pass with ID ${id} not found.`,
        });
      }

      if (req.user?.role === 'student' && pass.studentId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own gate passes.',
        });
      }

      res.status(200).json(pass);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/student/requests/:id/cancel
  async cancelRequest(req, res, next) {
    try {
      const { id } = req.params;
      const pass = dbService.getPassById(id);

      if (!pass) {
        return res.status(404).json({
          success: false,
          message: `Gate Pass with ID ${id} not found.`,
        });
      }

      if (req.user?.role === 'student' && pass.studentId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only cancel your own gate passes.',
        });
      }

      if (pass.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Cannot cancel a pass that is already ${pass.status}. Only pending requests can be cancelled.`,
        });
      }

      const updated = dbService.cancelPass(id);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/student/profile/:id
  async updateProfile(req, res, next) {
    try {
      const { id } = req.params;

      if (req.user?.role === 'student' && id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own profile.',
        });
      }

      const {
        name,
        department,
        semester,
        mobile,
        hostelRoom,
        guardianContact,
        avatar,
        gate,
      } = req.body;

      const safeUpdates = {};
      if (name !== undefined) safeUpdates.name = name;
      if (department !== undefined) safeUpdates.department = department;
      if (semester !== undefined) safeUpdates.semester = semester;
      if (mobile !== undefined) safeUpdates.mobile = mobile;
      if (hostelRoom !== undefined) safeUpdates.hostelRoom = hostelRoom;
      if (guardianContact !== undefined) safeUpdates.guardianContact = guardianContact;
      if (avatar !== undefined) safeUpdates.avatar = avatar;
      if (gate !== undefined) safeUpdates.gate = gate;

      const updatedUser = dbService.updateUser(id, safeUpdates);
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: `Student with ID ${id} not found.`,
        });
      }

      res.status(200).json(updatedUser);
    } catch (err) {
      next(err);
    }
  },
};
