'use strict';

const express = require('express');
const path = require('path');
const multer = require('multer');
const { body, param, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const { pool } = require('../config/db');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

const router = express.Router();

// Memory storage so no local disk files are kept on Railway
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  const dbName = process.env.DB_NAME || 'jrsd_os';
  
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id                    INT UNSIGNED   NOT NULL AUTO_INCREMENT,
      name                  VARCHAR(255)   NOT NULL,
      file_path             VARCHAR(500)   NOT NULL,
      file_type             VARCHAR(50)    NOT NULL,
      cloudinary_public_id VARCHAR(255)   DEFAULT NULL,
      uploaded_by           INT UNSIGNED   NOT NULL,
      target_type           ENUM('all', 'team', 'project') NOT NULL DEFAULT 'all',
      target_id             INT UNSIGNED   DEFAULT NULL,
      created_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_documents_target (target_type, target_id),
      INDEX idx_documents_uploader (uploaded_by),
      CONSTRAINT fk_documents_uploader
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Ensure column cloudinary_public_id exists if table was already created
  const [cols] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'documents' AND COLUMN_NAME = 'cloudinary_public_id'`,
    [dbName]
  );
  if (cols.length === 0) {
    await pool.execute(`
      ALTER TABLE documents
        ADD COLUMN cloudinary_public_id VARCHAR(255) DEFAULT NULL AFTER file_type
    `);
  }

  schemaReady = true;
}

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
}

function mapDocumentRow(row) {
  const isDirectUrl = row.file_path.startsWith('http://') || row.file_path.startsWith('https://') || row.file_path.startsWith('data:');
  const downloadUrl = isDirectUrl 
    ? row.file_path 
    : `http://localhost:${process.env.PORT || 3001}${row.file_path}`;

  return {
    id: row.id,
    name: row.name,
    filePath: row.file_path,
    fileType: row.file_type,
    cloudinaryPublicId: row.cloudinary_public_id || null,
    uploadedBy: row.uploaded_by,
    targetType: row.target_type,
    targetId: row.target_id,
    createdAt: row.created_at,
    downloadUrl,
  };
}

router.use(async (_req, res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (err) {
    console.error('[documents ensureSchema]', err.message);
    res.status(500).json({ success: false, message: 'Erreur initialisation schéma documents.' });
  }
});

/** POST /api/documents/upload */
router.post(
  '/upload',
  protect,
  upload.single('file'),
  [
    body('target_type')
      .isIn(['all', 'team', 'project'])
      .withMessage('target_type doit être all, team ou project.'),
    body('target_id')
      .optional({ nullable: true })
      .isInt()
      .withMessage('target_id doit être un entier.'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier fourni.' });
      }

      const { target_type, target_id } = req.body;
      
      // Validation: target_id is required unless target_type is 'all'
      if (target_type !== 'all' && !target_id) {
        return res.status(422).json({
          success: false,
          message: 'target_id est requis lorsque target_type est team ou project.',
        });
      }

      // Security: Non-admin users cannot upload to 'all'
      if (req.userRole !== 'admin' && target_type === 'all') {
        return res.status(403).json({
          success: false,
          message: 'Seuls les administrateurs peuvent téléverser des documents visibles par tous.',
        });
      }

      // Security: Non-admin users can only upload to their own team or projects
      if (req.userRole !== 'admin') {
        if (target_type === 'team') {
          const [userTeam] = await pool.execute(
            'SELECT team_id FROM users WHERE id = ?',
            [req.userId]
          );
          if (!userTeam.length || userTeam[0].team_id !== parseInt(target_id)) {
            return res.status(403).json({
              success: false,
              message: 'Vous ne pouvez téléverser que dans votre propre équipe.',
            });
          }
        } else if (target_type === 'project') {
          const [projectMember] = await pool.execute(
            'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
            [target_id, req.userId]
          );
          if (!projectMember.length) {
            return res.status(403).json({
              success: false,
              message: 'Vous ne pouvez téléverser que dans vos propres projets.',
            });
          }
        }
      }

      const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();
      const file_type = ext || 'unknown';

      // Centralized Cloudinary Upload with resource_type: "auto"
      const cloudResult = await uploadToCloudinary(req.file.buffer, {
        folder: 'jrsd_os/documents',
        resource_type: 'auto',
        mimetype: req.file.mimetype,
      });

      const [result] = await pool.execute(
        `INSERT INTO documents (name, file_path, file_type, cloudinary_public_id, uploaded_by, target_type, target_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.file.originalname,
          cloudResult.secure_url,
          file_type,
          cloudResult.public_id,
          req.userId,
          target_type,
          target_type === 'all' ? null : target_id,
        ]
      );

      const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [result.insertId]);
      
      res.status(201).json({
        success: true,
        message: 'Document téléversé avec succès.',
        document: mapDocumentRow(rows[0]),
      });
    } catch (err) {
      console.error('[POST /api/documents/upload]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur lors du téléversement.' });
    }
  }
);

/** GET /api/documents */
router.get('/', protect, async (req, res) => {
  try {
    let query;
    let params;

    if (req.userRole === 'admin') {
      query = `
        SELECT d.*, u.nom_prenom as uploader_name, u.email as uploader_email
        FROM documents d
        LEFT JOIN users u ON u.id = d.uploaded_by
        ORDER BY d.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT d.*, u.nom_prenom as uploader_name, u.email as uploader_email
        FROM documents d
        LEFT JOIN users u ON u.id = d.uploaded_by
        WHERE d.target_type = 'all'
           OR (d.target_type = 'team' AND d.target_id = (SELECT team_id FROM users WHERE id = ?))
           OR (d.target_type = 'project' AND d.target_id IN (
               SELECT pm.project_id FROM project_members pm WHERE pm.user_id = ?
             ))
        ORDER BY d.created_at DESC
      `;
      params = [req.userId, req.userId];
    }

    const [rows] = await pool.execute(query, params);
    
    res.json({ 
      success: true, 
      documents: rows.map(row => ({
        ...mapDocumentRow(row),
        uploaderName: row.uploader_name,
        uploaderEmail: row.uploader_email,
      }))
    });
  } catch (err) {
    console.error('[GET /api/documents]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** DELETE /api/documents/:id */
router.delete(
  '/:id',
  protect,
  [param('id').isInt().withMessage('ID invalide.')],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;

      const [docRows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [id]);
      if (!docRows.length) {
        return res.status(404).json({ success: false, message: 'Document introuvable.' });
      }

      const doc = docRows[0];

      if (req.userRole !== 'admin' && doc.uploaded_by !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez supprimer que vos propres documents.',
        });
      }

      // Delete from Cloudinary if public_id exists
      if (doc.cloudinary_public_id) {
        await deleteFromCloudinary(doc.cloudinary_public_id, 'auto');
      }

      // Delete database row
      await pool.execute('DELETE FROM documents WHERE id = ?', [id]);

      res.json({ success: true, message: 'Document supprimé.' });
    } catch (err) {
      console.error('[DELETE /api/documents/:id]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

module.exports = router;
