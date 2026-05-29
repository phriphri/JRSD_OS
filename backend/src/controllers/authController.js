// ============================================================
//  J-RSD OS — Contrôleur d'authentification
//  Fichier : backend/src/controllers/authController.js
//
//  Responsabilités :
//    - Logique métier isolée des routes
//    - Toutes les requêtes SQL utilisent pool.execute()
//      (requêtes préparées → protection injection SQL)
//    - bcrypt salt = 10 (directive sécurité)
//    - Le mot de passe n'est JAMAIS renvoyé dans une réponse
// ============================================================

'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const dns    = require('dns').promises;
const { pool } = require('../config/db');

/** Coût bcrypt — 10 rounds (directive sécurité du projet) */
const SALT_ROUNDS = 10;

// ────────────────────────────────────────────────────────────
//  Helpers privés
// ────────────────────────────────────────────────────────────

/**
 * Génère un token JWT signé.
 * @param {number} id   - ID utilisateur
 * @param {string} role - Rôle ('admin' | 'employe')
 * @returns {string} Token JWT
 */
function signToken(id, role) {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * Supprime le champ `password` d'un objet utilisateur
 * avant de l'inclure dans une réponse HTTP.
 * @param {object} user - Ligne brute retournée par MySQL
 * @returns {object} Utilisateur sans le hash de mot de passe
 */
function sanitizeUser(user) {
  // eslint-disable-next-line no-unused-vars
  const { password: _omit, ...safeUser } = user;
  return safeUser;
}

// ────────────────────────────────────────────────────────────
//  register
//  POST /api/auth/register
// ────────────────────────────────────────────────────────────

/**
 * Inscrit un nouvel utilisateur.
 * 1. Vérifie l'unicité de l'email  → pool.execute() avec ?
 * 2. Hache le mot de passe         → bcrypt, 10 rounds
 * 3. Insère dans `users`           → pool.execute() avec ?
 * 4. Retourne un token JWT + profil (sans password)
 */
async function register(req, res) {
  const {
    nom_prenom,
    email,
    password,
    cle_activation,
    fonction = null,
    role = 'employe',
  } = req.body;

  try {
    // ── Étape 1a : Vérification du code d'invitation ─────────────────
    const [invitations] = await pool.execute(
      'SELECT id, is_used, expires_at FROM workspace_invitations WHERE code = ? LIMIT 1',
      [cle_activation]
    );

    if (invitations.length === 0) {
      return res.status(400).json({ success: false, message: 'Code d\'invitation invalide.' });
    }
    const invitation = invitations[0];
    if (invitation.is_used) {
      return res.status(400).json({ success: false, message: 'Ce code d\'invitation a déjà été utilisé.' });
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Ce code d\'invitation est expiré.' });
    }

    // ── Étape 1b : Vérification DNS de l'email ──────────────────────
    const domain = email.split('@')[1];
    try {
      const records = await dns.resolveMx(domain);
      if (!records || records.length === 0) {
        return res.status(400).json({ success: false, message: 'Domaine de l\'email invalide ou sans serveur de messagerie.' });
      }
    } catch (dnsErr) {
      if (dnsErr.code === 'ENOTFOUND' || dnsErr.code === 'ENODATA') {
        return res.status(400).json({ success: false, message: 'Domaine de l\'email introuvable.' });
      }
      // Si erreur réseau locale (ex: ECONNREFUSED), on passe l'erreur silencieusement en dev
      console.warn(`[DNS Warning] Impossible de vérifier MX pour ${domain}: ${dnsErr.code}`);
    }

    // ── Étape 1c : unicité email ──────────────────────────────
    // pool.execute() → requête préparée, aucune concaténation SQL
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]                              // ← paramètre lié, jamais concaténé
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà associé à un compte.',
      });
    }

    // ── Étape 2 : hachage du mot de passe ───────────────────
    // Salt = 10 (directive projet). Le mot de passe en clair
    // n'est JAMAIS stocké ni journalisé.
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // ── Étape 3 : insertion SQL (requête préparée) ───────────
    const [result] = await pool.execute(
      `INSERT INTO users (nom_prenom, email, password, fonction, role)
       VALUES (?, ?, ?, ?, ?)`,
      [nom_prenom, email, hashedPassword, fonction, role]
      //  ↑ Tous des placeholders ? — protection totale anti-injection
    );

    const newUserId = result.insertId;

    // ── Étape 3.5 : marquer l'invitation comme utilisée ──────
    await pool.execute(
      'UPDATE workspace_invitations SET is_used = TRUE WHERE id = ?',
      [invitation.id]
    );

    // ── Étape 4 : token JWT ──────────────────────────────────
    const token = signToken(newUserId, role);

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès.',
      token,
      user: {
        id: newUserId,
        nom_prenom,
        email,
        fonction,
        role,
        // ⚠️ Le hash bcrypt n'est pas inclus ici
      },
    });
  } catch (err) {
    console.error('[authController.register]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur interne.' });
  }
}

// ────────────────────────────────────────────────────────────
//  login
//  POST /api/auth/login
// ────────────────────────────────────────────────────────────

/**
 * Authentifie un utilisateur existant.
 * 1. Sélectionne l'utilisateur par email → pool.execute()
 * 2. Compare le mot de passe avec bcrypt.compare()
 * 3. Génère et retourne un token JWT
 * 4. Le hash n'est jamais renvoyé au client
 */
async function login(req, res) {
  const { email, password } = req.body;

  try {
    // ── Étape 1 : recherche par email (requête préparée) ─────
    const [rows] = await pool.execute(
      `SELECT id, nom_prenom, email, password, fonction, role, statut
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]   // ← paramètre lié — aucune interpolation de chaîne
    );

    // Message générique : évite l'énumération de comptes valides
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect.',
      });
    }

    const user = rows[0];

    // ── Étape 2 : vérification bcrypt ───────────────────────
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect.',
      });
    }

    if (user.statut === 'suspendu') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été suspendu. Contactez un administrateur.',
      });
    }

    // ── Étape 3 : génération du token JWT ───────────────────
    const token = signToken(user.id, user.role);

    // ── Étape 4 : réponse sans le hash ──────────────────────
    return res.status(200).json({
      success: true,
      message: 'Connexion réussie.',
      token,
      user: sanitizeUser(user), // retire le champ `password` du retour
    });
  } catch (err) {
    console.error('[authController.login]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur interne.' });
  }
}

// ────────────────────────────────────────────────────────────
//  getMe
//  GET /api/auth/me  (JWT requis)
// ────────────────────────────────────────────────────────────

/**
 * Retourne le profil de l'utilisateur authentifié.
 * L'ID est extrait du token par le middleware, jamais de la query string.
 */
async function getMe(req, res) {
  try {
    // pool.execute() — requête préparée avec l'ID issu du token (pas du body)
    const [rows] = await pool.execute(
      `SELECT id, nom_prenom, email, fonction, role, statut, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    if (rows[0].statut === 'suspendu') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été suspendu. Contactez un administrateur.',
      });
    }

    return res.status(200).json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('[authController.getMe]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur interne.' });
  }
}

// ────────────────────────────────────────────────────────────
//  generateInvitation
//  POST /api/auth/invitation  (JWT requis, Admin only)
// ────────────────────────────────────────────────────────────

async function generateInvitation(req, res) {
  try {
    // Générer un code aléatoire sécurisé (ex: J-RSD-XXXXX)
    const randomPart = require('crypto').randomBytes(3).toString('hex').toUpperCase();
    const code = `J-RSD-${randomPart}`;
    
    // Valide pour 7 jours
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await pool.execute(
      `INSERT INTO workspace_invitations (code, expires_at, is_used) VALUES (?, ?, FALSE)`,
      [code, expiresAt]
    );

    return res.status(201).json({ success: true, code, expires_at: expiresAt });
  } catch (err) {
    console.error('[authController.generateInvitation]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur interne.' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  generateInvitation,
};
