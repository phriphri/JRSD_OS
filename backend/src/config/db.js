// ============================================================
//  J-RSD OS — Configuration de la connexion MySQL
//  Fichier : backend/src/config/db.js
//
//  Utilise : mysql2/promise avec pool de connexions
//  pool.execute() → requêtes préparées (anti-injection SQL)
// ============================================================

'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

/**
 * Pool de connexions MySQL2.
 *
 * Pourquoi un pool ?
 *   - Réutilisation des connexions → moins de latence
 *   - Gestion automatique de la reconnexion
 *   - Limite le nombre de connexions simultanées
 *
 * Pourquoi pool.execute() dans les contrôleurs ?
 *   - execute() utilise les "Prepared Statements" MySQL
 *   - Les paramètres sont envoyés séparément de la requête SQL
 *   - Protection totale contre les injections SQL
 *   - MySQL met en cache le plan d'exécution → plus rapide
 */
const pool = mysql.createPool({
  host    : process.env.DB_HOST     || 'localhost',
  port    : parseInt(process.env.DB_PORT || '3306', 10),
  user    : process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'jrsd_os',

  // ── Pool settings ──────────────────────────────────────────
  waitForConnections : true,
  connectionLimit    : 10,   // Max 10 connexions simultanées
  queueLimit         : 0,    // File illimitée (0 = pas de limite)
  idleTimeout        : 60000, // Fermer les connexions idle après 60s
  enableKeepAlive    : true,  // Maintient les connexions TCP actives
  keepAliveInitialDelay: 0,

  // ── Encodage & timezone ────────────────────────────────────
  charset  : 'utf8mb4',
  timezone : '+00:00', // Toujours UTC — cohérence avec les timestamps

  // ── Robustesse ─────────────────────────────────────────────
  // namedPlaceholders: false (défaut) → utiliser ? pas :name
  // Les requêtes préparées via execute() sont mises en cache
  // côté serveur MySQL pour de meilleures performances.
});

/**
 * Teste la connexion au démarrage du serveur.
 * Arrête le processus si MySQL est inaccessible.
 * @returns {Promise<void>}
 */
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    // Ping pour valider que la connexion est vraiment active
    await conn.ping();
    console.log(
      `✅  MySQL connecté → ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}` +
      ` / base : "${process.env.DB_NAME}"`
    );
  } catch (err) {
    console.error('❌  Impossible de se connecter à MySQL :', err.message);
    console.error('    Vérifiez les variables dans backend/.env');
    process.exit(1);
  } finally {
    if (conn) conn.release(); // Toujours libérer la connexion
  }
}

module.exports = { pool, testConnection };
