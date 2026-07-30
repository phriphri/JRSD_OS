-- ============================================================
--  J-RSD OS — Migration SQL
--  Version    : 003b
--  Description: Création de la table `teams` et ajout de team_id à users
-- ============================================================

-- ──────────────────────────────────────────────────────────────
--  Table : teams
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  nom         VARCHAR(150)   NOT NULL,
  description TEXT           DEFAULT NULL,
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_teams_nom (nom)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Équipes de travail';

-- ──────────────────────────────────────────────────────────────
--  Ajout de team_id à la table users (idempotent)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN team_id INT UNSIGNED DEFAULT NULL COMMENT 'FK vers teams.id';

ALTER TABLE users
  ADD INDEX idx_users_team (team_id);

ALTER TABLE users
  ADD CONSTRAINT fk_users_team
    FOREIGN KEY (team_id) REFERENCES teams(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Enregistrement de la migration
INSERT IGNORE INTO schema_migrations (version) VALUES ('003b');
