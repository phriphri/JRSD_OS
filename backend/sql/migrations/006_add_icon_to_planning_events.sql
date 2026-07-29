-- ============================================================
--  J-RSD OS — Migration SQL
--  Version    : 006
--  Date       : 2026-05-29
--  Description: Ajout du champ icon à la table planning_events
--
--  Pour exécuter :
--    node src/scripts/initDb.js
--  ou directement dans MySQL :
--    SOURCE backend/sql/migrations/006_add_icon_to_planning_events.sql;
-- ============================================================

-- Ajout du champ icon à la table planning_events
ALTER TABLE planning_events 
ADD COLUMN icon VARCHAR(50) DEFAULT NULL COMMENT 'Icone de l evenement'
AFTER description;

-- Enregistrement de la migration
INSERT IGNORE INTO schema_migrations (version) VALUES ('006');

-- ============================================================
--  ROLLBACK (commenté — décommentez pour annuler la migration)
-- ============================================================
-- ALTER TABLE planning_events DROP COLUMN icon;
-- DELETE FROM schema_migrations WHERE version = '006';
