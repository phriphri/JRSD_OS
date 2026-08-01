'use strict';
const { pool } = require('../config/db');

async function run() {
  console.log('Application de la migration 011_create_user_notifications.sql...');

  // 1. Créer la table (idempotent grâce à IF NOT EXISTS)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id            INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
      user_id       INT UNSIGNED     NOT NULL,
      type          VARCHAR(64)      NOT NULL,
      title         VARCHAR(255)     NOT NULL,
      body          TEXT             DEFAULT NULL,
      link          VARCHAR(500)     DEFAULT NULL,
      entity_type   VARCHAR(64)      DEFAULT NULL,
      entity_id     INT UNSIGNED     DEFAULT NULL,
      is_read       TINYINT(1)       NOT NULL DEFAULT 0,
      created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_un_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY uq_notif (user_id, entity_type, entity_id, type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Créer l'index seulement s'il n'existe pas
  const dbName = process.env.DB_NAME || 'jrsd_os';
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = 'user_notifications' AND index_name = 'idx_un_user_read'`,
    [dbName]
  );

  if (rows[0].cnt === 0) {
    await pool.execute('CREATE INDEX idx_un_user_read ON user_notifications (user_id, is_read)');
    console.log('  ↳ Index idx_un_user_read créé.');
  } else {
    console.log('  ↳ Index idx_un_user_read existe déjà, ignoré.');
  }

  // 3. Enregistrer la migration
  await pool.execute("INSERT IGNORE INTO schema_migrations (version) VALUES ('011')");

  console.log('✅ Migration 011 appliquée avec succès.');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erreur de migration:', err.message);
  process.exit(1);
});
