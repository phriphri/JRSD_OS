'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect, adminOnly } = require('../middleware/auth');
const { pool } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/* ── Avatar upload ────────────────────────────────────────────── */
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.userId}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Format non supporté.'));
  }
});

/* ── CV upload ────────────────────────────────────────────────── */
const cvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/cv');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cv_${req.userId}_${Date.now()}${ext}`);
  }
});
const uploadCv = multer({
  storage: cvStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format non supporté. Utilisez PDF ou PNG.'));
  }
});

const router = express.Router();

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
}

/** GET /api/users/managers — Liste des chefs de projet */
router.get('/managers', protect, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, nom_prenom, email, fonction, role, created_at
       FROM users WHERE role = 'manager' ORDER BY nom_prenom ASC`
    );
    res.json({ success: true, managers: rows });
  } catch (err) {
    console.error('[GET /api/users/managers]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** GET /api/users - Fetch all users */
router.get('/', protect, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, nom_prenom, email, fonction, role, avatar, created_at FROM users ORDER BY created_at ASC`
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error('[GET /api/users]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** PUT /api/users/:id/role - Update user role (Admin only) */
router.put('/:id/role',
  protect,
  adminOnly,
  [
    param('id').isInt().withMessage('ID invalide.'),
    body('role').isIn(['admin', 'manager', 'employe']).withMessage('Rôle invalide.')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const [result] = await pool.execute(
        `UPDATE users SET role = ? WHERE id = ?`,
        [role, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
      }

      res.json({ success: true, message: 'Rôle mis à jour.' });
    } catch (err) {
      console.error('[PUT /api/users/:id/role]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

/** PUT /api/users/profile - Update user profile (Self) */
router.put('/profile', protect, upload.single('avatar'), async (req, res) => {
  try {
    const { nom_prenom, email, deleteAvatar } = req.body;
    let query = 'UPDATE users SET nom_prenom = ?, email = ?';
    let params = [nom_prenom, email];

    // Get current user avatar
    const [rows] = await pool.execute('SELECT avatar FROM users WHERE id = ?', [req.userId]);
    const currentAvatar = rows[0]?.avatar;

    if (req.file) {
      // Delete old avatar if any
      if (currentAvatar) {
        const oldPath = path.join(__dirname, '../../', currentAvatar.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch {}
        }
      }
      const avatarUrl = `/uploads/${req.file.filename}`;
      query += ', avatar = ?';
      params.push(avatarUrl);
    } else if (deleteAvatar === 'true' || deleteAvatar === true) {
      // Delete old avatar if any
      if (currentAvatar) {
        const oldPath = path.join(__dirname, '../../', currentAvatar.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch {}
        }
      }
      query += ', avatar = NULL';
    }

    query += ' WHERE id = ?';
    params.push(req.userId);

    await pool.execute(query, params);

    res.json({ success: true, message: 'Profil mis à jour avec succès.' });
  } catch (err) {
    console.error('[PUT /api/users/profile]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** POST /api/users/profile/cv — Upload / replace CV (non-admin only) */
router.post('/profile/cv', protect, uploadCv.single('cv'), async (req, res) => {
  try {
    const role = req.userRole;
    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Les admins ne peuvent pas déposer de CV.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni.' });
    }

    // Delete old CV file if it exists
    const [rows] = await pool.execute('SELECT cv_url FROM users WHERE id = ?', [req.userId]);
    const oldCv = rows[0]?.cv_url;
    if (oldCv) {
      const oldPath = path.join(__dirname, '../../', oldCv.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch {}
      }
    }

    const cvUrl = `/uploads/cv/${req.file.filename}`;
    await pool.execute('UPDATE users SET cv_url = ? WHERE id = ?', [cvUrl, req.userId]);

    res.json({
      success: true,
      message: 'CV enregistré avec succès.',
      cv_url: cvUrl,
      cv_filename: req.file.originalname,
    });
  } catch (err) {
    console.error('[POST /api/users/profile/cv]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** DELETE /api/users/profile/cv — Remove CV (self) */
router.delete('/profile/cv', protect, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT cv_url FROM users WHERE id = ?', [req.userId]);
    const cvUrl = rows[0]?.cv_url;

    if (cvUrl) {
      const filePath = path.join(__dirname, '../../', cvUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    await pool.execute('UPDATE users SET cv_url = NULL WHERE id = ?', [req.userId]);

    res.json({ success: true, message: 'CV supprimé.' });
  } catch (err) {
    console.error('[DELETE /api/users/profile/cv]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** GET /api/users/:id/cv — Download or view CV (admin only) */
router.get('/:id/cv', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { preview } = req.query;
    const [rows] = await pool.execute('SELECT nom_prenom, cv_url FROM users WHERE id = ?', [id]);

    if (!rows.length || !rows[0].cv_url) {
      return res.status(404).json({ success: false, message: 'Aucun CV disponible pour cet utilisateur.' });
    }

    const { nom_prenom, cv_url } = rows[0];
    const filePath = path.join(__dirname, '../../', cv_url.replace(/^\//, ''));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Fichier introuvable.' });
    }

    const ext = path.extname(filePath).toLowerCase();

    if (preview === 'true') {
      let contentType = 'application/octet-stream';
      if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      return res.sendFile(filePath);
    }

    const safeName = nom_prenom.replace(/\s+/g, '_');
    res.download(filePath, `CV_${safeName}${ext}`);
  } catch (err) {
    console.error('[GET /api/users/:id/cv]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
