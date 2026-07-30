-- ============================================================
--  J-RSD OS — Migration SQL
--  Version    : 004
--  Description: Création de la table `planning_events`
-- ============================================================

CREATE TABLE IF NOT EXISTS planning_events (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  title           VARCHAR(255)   NOT NULL,
  description     TEXT           DEFAULT NULL,
  start_time      DATETIME       NOT NULL,
  end_time        DATETIME       NOT NULL,
  target_type     ENUM('all', 'team') NOT NULL DEFAULT 'all',
  target_team_id  INT UNSIGNED   DEFAULT NULL,
  created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ajout de la contrainte de clé étrangère vers teams (idempotent)
-- Vérifie d'abord si la contrainte existe
SET @constraint_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'planning_events'
    AND CONSTRAINT_NAME = 'fk_planning_team'
);

SET @sql = IF(@constraint_exists = 0,
  'ALTER TABLE planning_events ADD CONSTRAINT fk_planning_team FOREIGN KEY (target_team_id) REFERENCES teams(id) ON DELETE CASCADE',
  'SELECT ''Constraint already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO schema_migrations (version) VALUES ('004');
