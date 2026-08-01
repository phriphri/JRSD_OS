-- 011_create_user_notifications.sql
-- Système de notifications automatiques par utilisateur (distinct des annonces admin)
-- Anciennement 003_create_user_notifications.sql — renommé pour éviter le doublon avec 003_add_manager_role_and_create_tables.sql

CREATE TABLE IF NOT EXISTS user_notifications (
  id            INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED     NOT NULL,
  type          VARCHAR(64)      NOT NULL,            -- ex: task_assigned, project_updated …
  title         VARCHAR(255)     NOT NULL,
  body          TEXT             DEFAULT NULL,
  link          VARCHAR(500)     DEFAULT NULL,        -- route frontend ex: /tasks, /projects/3
  entity_type   VARCHAR(64)      DEFAULT NULL,        -- tasks | projects | planning | messages
  entity_id     INT UNSIGNED     DEFAULT NULL,
  is_read       TINYINT(1)       NOT NULL DEFAULT 0,
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_un_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,

  -- Anti-doublon : un seul enregistrement par (user, entité, type)
  -- ON DUPLICATE KEY UPDATE permet de rafraîchir la date si besoin
  UNIQUE KEY uq_notif (user_id, entity_type, entity_id, type)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index pour les requêtes fréquentes
-- MySQL ne supporte pas CREATE INDEX IF NOT EXISTS.
-- On vérifie d'abord dans information_schema avant de créer.
SET @dbname = DATABASE();
SET @idx_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @dbname
    AND table_name   = 'user_notifications'
    AND index_name   = 'idx_un_user_read'
);

SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX idx_un_user_read ON user_notifications (user_id, is_read)',
  'SELECT 1 /* index idx_un_user_read already exists */'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO schema_migrations (version) VALUES ('011');
