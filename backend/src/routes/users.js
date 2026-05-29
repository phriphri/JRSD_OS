'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect, adminOnly } = require('../middleware/auth');
const { pool } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Format non supporté.'));
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
      `SELECT id, nom_prenom, email, fonction, role, created_at FROM users ORDER BY created_at ASC`
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
    const { nom_prenom, email } = req.body;
    let query = 'UPDATE users SET nom_prenom = ?, email = ?';
    let params = [nom_prenom, email];

    if (req.file) {
      const avatarUrl = `/uploads/${req.file.filename}`;
      query += ', avatar = ?';
      params.push(avatarUrl);
    }
    query += ' WHERE id = ?';
    params.push(req.user.id);

    await pool.execute(query, params);

    res.json({ success: true, message: 'Profil mis à jour avec succès.', avatar: req.file ? `/uploads/${req.file.filename}` : undefined });
  } catch (err) {
    console.error('[PUT /api/users/profile]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
