'use strict';
const { pool } = require('../config/db');

async function run() {
  console.log('Application de la migration 003_create_user_notifications.sql...');
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
  console.log('✅ Table user_notifications créée avec succès.');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erreur de migration:', err.message);
  process.exit(1);
});
