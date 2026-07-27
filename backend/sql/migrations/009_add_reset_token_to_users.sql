USE jrsd_os;

ALTER TABLE users
  ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL COMMENT 'Token temporaire pour réinitialiser le mot de passe',
  ADD COLUMN reset_expires DATETIME DEFAULT NULL COMMENT 'Date d\'expiration du token de réinitialisation';

INSERT IGNORE INTO schema_migrations (version) VALUES ('009');
