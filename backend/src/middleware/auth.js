// ============================================================
//  J-RSD OS — Middleware d'authentification JWT
//  Fichier : backend/src/middleware/auth.js
//
//  Usage dans les routes :
//    const { protect, adminOnly } = require('../middleware/auth');
//    router.get('/admin', protect, adminOnly, handler);
// ============================================================

'use strict';

const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const SUSPENDED_MESSAGE = 'Votre compte a été suspendu. Contactez un administrateur.';

// ────────────────────────────────────────────────────────────
//  protect
//  Vérifie la présence et la validité du token JWT.
//  Injecte req.userId et req.userRole si valide.
// ────────────────────────────────────────────────────────────
async function protect(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1]; // Schéma : Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Accès refusé. Token d\'authentification manquant.',
    });
  }

  try {
    const decoded  = jwt.verify(token, process.env.JWT_SECRET);
    req.userId     = decoded.id;
    req.userRole   = decoded.role;

    const [rows] = await pool.execute(
      'SELECT statut FROM users WHERE id = ? LIMIT 1',
      [req.userId]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    if (rows[0].statut === 'suspendu') {
      return res.status(403).json({ success: false, message: SUSPENDED_MESSAGE });
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      const message = err.name === 'TokenExpiredError'
        ? 'Session expirée. Veuillez vous reconnecter.'
        : 'Token invalide.';
      return res.status(403).json({ success: false, message });
    }
    console.error('[protect]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
}

// ────────────────────────────────────────────────────────────
//  adminOnly
//  À utiliser APRÈS protect.
//  Bloque les requêtes dont le rôle n'est pas 'admin'.
// ────────────────────────────────────────────────────────────
function adminOnly(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs.',
    });
  }
  next();
}

// ────────────────────────────────────────────────────────────
//  managerOrAdmin
//  À utiliser APRÈS protect.
//  Autorise les rôles 'admin' et 'manager'.
// ────────────────────────────────────────────────────────────
function managerOrAdmin(req, res, next) {
  if (req.userRole !== 'admin' && req.userRole !== 'manager') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux managers et administrateurs.',
    });
  }
  next();
}

module.exports = { protect, adminOnly, managerOrAdmin };
