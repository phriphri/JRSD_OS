// ============================================================
//  J-RSD OS — Script d'initialisation/migration de la base
//  Fichier : backend/src/scripts/initDb.js
//
//  Usage :  node src/scripts/initDb.js
//  NPM  :   npm run db:init
//
//  Ce script exécute toutes les migrations SQL trouvées dans
//  sql/migrations/ dans l'ordre alphabétique, en sautant celles
//  déjà enregistrées dans la table schema_migrations.
// ============================================================

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../../sql/migrations');

async function initDb() {
  // Connexion sans sélectionner de database (pour CREATE DATABASE)
  const conn = await mysql.createConnection({
    host              : process.env.DB_HOST     || 'localhost',
    port              : parseInt(process.env.DB_PORT || '3306', 10),
    user              : process.env.DB_USER     || 'root',
    password          : process.env.DB_PASSWORD || '',
    multipleStatements: true, // requis pour enchaîner les instructions SQL
  });

  console.log('📡  Connexion MySQL établie.\n');

  // ── 1. Lister les fichiers de migration (ordre alphabétique) ─
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort(); // 001_... avant 002_... etc.

  if (migrationFiles.length === 0) {
    console.log('⚠️   Aucun fichier de migration trouvé dans', MIGRATIONS_DIR);
    await conn.end();
    return;
  }

  // ── 2. Exécuter chaque migration ──────────────────────────────
  for (const file of migrationFiles) {
    const version = file.split('_')[0]; // ex. "001"
    const filePath = path.join(MIGRATIONS_DIR, file);

    console.log(`▶   Migration ${version} — ${file}`);

    // Lire le SQL et supprimer les lignes de commentaires --
    const rawSql = fs.readFileSync(filePath, 'utf-8');
    const cleanSql = rawSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .trim();

    try {
      await conn.query(cleanSql);
      console.log(`    ✅  Migration ${version} appliquée avec succès.\n`);
    } catch (err) {
      // Ignorer les erreurs "table already exists" (idempotence)
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log(`    ℹ️   Migration ${version} déjà appliquée (table existante).\n`);
      } else {
        console.error(`    ❌  Erreur lors de la migration ${version} :`, err.message);
        await conn.end();
        process.exit(1);
      }
    }
  }

  console.log('🎉  Toutes les migrations ont été exécutées.');
  await conn.end();
}

initDb().catch((err) => {
  console.error('❌  Erreur critique :');
  console.error('    Code    :', err.code);
  console.error('    Message :', err.message);
  console.error('    Errno   :', err.errno);
  console.error('    SQL State:', err.sqlState);
  console.error('    Stack   :', err.stack);
  process.exit(1);
});
