'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect, adminOnly } = require('../middleware/auth');
const { pool } = require('../config/db');
const multer = require('multer');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

/* ── Multer Memory Storage ────────────────────────────────────── */
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const router = express.Router();
let schemaReady = false;

async function ensureUserSchema() {
  if (schemaReady) return;
  const dbName = process.env.DB_NAME || 'jrsd_os';

  // Ensure columns avatar_public_id and cv_public_id exist
  const [avatarCols] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_public_id'`,
    [dbName]
  );
  if (avatarCols.length === 0) {
    await pool.execute(`ALTER TABLE users ADD COLUMN avatar_public_id VARCHAR(255) DEFAULT NULL AFTER avatar`);
  }

  const [cvCols] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'cv_public_id'`,
    [dbName]
  );
  if (cvCols.length === 0) {
    await pool.execute(`ALTER TABLE users ADD COLUMN cv_public_id VARCHAR(255) DEFAULT NULL AFTER cv_url`);
  }

  schemaReady = true;
}

router.use(async (_req, res, next) => {
  try {
    await ensureUserSchema();
    next();
  } catch (err) {
    console.error('[users ensureUserSchema]', err.message);
    res.status(500).json({ success: false, message: 'Erreur initialisation schéma utilisateurs.' });
  }
});

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
router.get('/', protect, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, nom_prenom, email, fonction, role, avatar, avatar_public_id, cv_url, cv_public_id, created_at FROM users ORDER BY created_at ASC`
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
router.put('/profile', protect, uploadMemory.single('avatar'), async (req, res) => {
  try {
    const { nom_prenom, email, deleteAvatar } = req.body;
    let query = 'UPDATE users SET nom_prenom = ?, email = ?';
    let params = [nom_prenom, email];

    const [rows] = await pool.execute('SELECT avatar, avatar_public_id FROM users WHERE id = ?', [req.userId]);
    const userRow = rows[0];

    if (req.file) {
      if (userRow?.avatar_public_id) {
        await deleteFromCloudinary(userRow.avatar_public_id, 'image');
      }

      const cloudResult = await uploadToCloudinary(req.file.buffer, {
        folder: 'jrsd_os/avatars',
        resource_type: 'image',
        mimetype: req.file.mimetype,
      });

      query += ', avatar = ?, avatar_public_id = ?';
      params.push(cloudResult.secure_url, cloudResult.public_id);
    } else if (deleteAvatar === 'true' || deleteAvatar === true) {
      if (userRow?.avatar_public_id) {
        await deleteFromCloudinary(userRow.avatar_public_id, 'image');
      }
      query += ', avatar = NULL, avatar_public_id = NULL';
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
router.post('/profile/cv', protect, uploadMemory.single('cv'), async (req, res) => {
  try {
    const role = req.userRole;
    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Les admins ne peuvent pas déposer de CV.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni.' });
    }

    const [rows] = await pool.execute('SELECT cv_url, cv_public_id FROM users WHERE id = ?', [req.userId]);
    const userRow = rows[0];
    if (userRow?.cv_public_id) {
      await deleteFromCloudinary(userRow.cv_public_id, 'auto');
    }

    const cloudResult = await uploadToCloudinary(req.file.buffer, {
      folder: 'jrsd_os/cv',
      resource_type: 'auto',
      mimetype: req.file.mimetype,
    });

    await pool.execute(
      'UPDATE users SET cv_url = ?, cv_public_id = ? WHERE id = ?',
      [cloudResult.secure_url, cloudResult.public_id, req.userId]
    );

    res.json({
      success: true,
      message: 'CV enregistré avec succès.',
      cv_url: cloudResult.secure_url,
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
    const [rows] = await pool.execute('SELECT cv_url, cv_public_id FROM users WHERE id = ?', [req.userId]);
    const userRow = rows[0];

    if (userRow?.cv_public_id) {
      await deleteFromCloudinary(userRow.cv_public_id, 'auto');
    }

    await pool.execute('UPDATE users SET cv_url = NULL, cv_public_id = NULL WHERE id = ?', [req.userId]);

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
    const [rows] = await pool.execute('SELECT nom_prenom, cv_url FROM users WHERE id = ?', [id]);

    if (!rows.length || !rows[0].cv_url) {
      return res.status(404).json({ success: false, message: 'Aucun CV disponible pour cet utilisateur.' });
    }

    const { cv_url } = rows[0];
    
    // Redirect directly to the Cloudinary URL
    return res.redirect(cv_url);
  } catch (err) {
    console.error('[GET /api/users/:id/cv]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
