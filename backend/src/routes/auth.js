// ============================================================
//  J-RSD OS — Routes d'authentification
//  Fichier : backend/src/routes/auth.js
//
//  Ce fichier ne contient QUE la définition des routes et la
//  validation des entrées. La logique métier est dans :
//  → backend/src/controllers/authController.js
//
//  POST /api/auth/register  →  Inscription
//  POST /api/auth/login     →  Connexion
//  GET  /api/auth/me        →  Profil courant (JWT requis)
//  POST /api/auth/invitation → Génération clé (Admin requis)
// ============================================================

'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, adminOnly } = require('../middleware/auth');
const { register, login, getMe, generateInvitation } = require('../controllers/authController');

const router = express.Router();

// ────────────────────────────────────────────────────────────
//  Middleware : centralise la gestion des erreurs de validation
// ────────────────────────────────────────────────────────────
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
}

// ────────────────────────────────────────────────────────────
//  Règles de validation — Register
// ────────────────────────────────────────────────────────────
const registerRules = [
  body('nom_prenom')
    .trim()
    .notEmpty()
    .withMessage('Le nom et prénom sont obligatoires.')
    .isLength({ max: 150 })
    .withMessage('Le nom ne peut pas dépasser 150 caractères.'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email invalide.')
    .isLength({ max: 255 })
    .withMessage("L'email ne peut pas dépasser 255 caractères."),

  body('password')
    .isLength({ min: 3 })
    .withMessage('Le mot de passe doit contenir au moins 3 caractères.'),

  body('cle_activation')
    .notEmpty()
    .withMessage("La clé d'activation est requise."),

  body('fonction')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('La fonction ne peut pas dépasser 150 caractères.'),

  body('role')
    .optional()
    .isIn(['admin', 'manager', 'employe'])
    .withMessage("Le rôle doit être 'admin', 'manager' ou 'employe'."),
];

// ────────────────────────────────────────────────────────────
//  Règles de validation — Login
// ────────────────────────────────────────────────────────────
const loginRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email invalide.'),

  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis.'),
];

// ────────────────────────────────────────────────────────────
//  Montage des routes
// ────────────────────────────────────────────────────────────

/** POST /api/auth/register */
router.post('/register', registerRules, validateRequest, register);

/** POST /api/auth/login */
router.post('/login', loginRules, validateRequest, login);

/** GET /api/auth/me — protégée par JWT */
router.get('/me', protect, getMe);

/** POST /api/auth/invitation — génère une clé (Admin uniquement) */
router.post('/invitation', protect, adminOnly, generateInvitation);

module.exports = router;
