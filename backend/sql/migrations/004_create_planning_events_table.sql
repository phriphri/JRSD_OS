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

  PRIMARY KEY (id),
  CONSTRAINT fk_planning_team FOREIGN KEY (target_team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version) VALUES ('004');
