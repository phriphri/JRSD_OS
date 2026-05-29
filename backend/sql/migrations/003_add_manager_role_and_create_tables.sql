USE jrsd_os;

ALTER TABLE users
  MODIFY COLUMN role ENUM('admin', 'manager', 'employe') NOT NULL DEFAULT 'employe'
  COMMENT 'Rôle applicatif : admin | manager | employe';

CREATE TABLE IF NOT EXISTS projects (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  nom         VARCHAR(255)   NOT NULL                    COMMENT 'Nom du projet (ex: J4Edu, J4Link)',
  description TEXT           DEFAULT NULL                COMMENT 'Description détaillée du projet',
  date_debut  DATE           DEFAULT NULL,
  date_fin    DATE           DEFAULT NULL,
  statut      ENUM('en_attente', 'en_cours', 'termine')
              NOT NULL DEFAULT 'en_attente'              COMMENT 'Statut courant du projet',
  manager_id  INT UNSIGNED   DEFAULT NULL                COMMENT 'FK vers users(id) — le manager assigné',

  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_projects_statut (statut),
  INDEX idx_projects_manager (manager_id),

  CONSTRAINT fk_projects_manager
    FOREIGN KEY (manager_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Projets de l''entreprise';

CREATE TABLE IF NOT EXISTS tasks (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  project_id  INT UNSIGNED   NOT NULL                    COMMENT 'FK vers projects(id)',
  titre       VARCHAR(255)   NOT NULL,
  description TEXT           DEFAULT NULL,
  statut      ENUM('a_faire', 'en_cours', 'bloque', 'termine')
              NOT NULL DEFAULT 'a_faire'                 COMMENT 'Statut de la tâche',
  priorite    ENUM('basse', 'moyenne', 'haute')
              NOT NULL DEFAULT 'moyenne'                 COMMENT 'Niveau de priorité',
  assignee_id INT UNSIGNED   DEFAULT NULL                COMMENT 'FK vers users(id) — employé assigné',
  deadline    DATE           DEFAULT NULL,

  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_tasks_project (project_id),
  INDEX idx_tasks_assignee (assignee_id),
  INDEX idx_tasks_statut (statut),

  CONSTRAINT fk_tasks_project
    FOREIGN KEY (project_id) REFERENCES projects(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_tasks_assignee
    FOREIGN KEY (assignee_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tâches rattachées aux projets';

CREATE TABLE IF NOT EXISTS events (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  titre       VARCHAR(255)   NOT NULL,
  date        DATE           NOT NULL,
  heure       TIME           NOT NULL,
  type        ENUM('meeting', 'review', 'milestone')
              NOT NULL DEFAULT 'meeting'                 COMMENT 'Type d''événement',
  project_id  INT UNSIGNED   DEFAULT NULL                COMMENT 'FK vers projects(id) — optionnel',
  created_by  INT UNSIGNED   NOT NULL                    COMMENT 'FK vers users(id) — créateur',

  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_events_date (date),
  INDEX idx_events_project (project_id),

  CONSTRAINT fk_events_project
    FOREIGN KEY (project_id) REFERENCES projects(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_events_creator
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Événements, réunions et jalons';

CREATE TABLE IF NOT EXISTS documents (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  nom         VARCHAR(255)   NOT NULL                    COMMENT 'Nom du document',
  fichier_url VARCHAR(500)   NOT NULL                    COMMENT 'URL ou chemin du fichier',
  taille_kb   INT UNSIGNED   DEFAULT NULL                COMMENT 'Taille en Ko',
  project_id  INT UNSIGNED   DEFAULT NULL                COMMENT 'FK vers projects(id) — optionnel',
  task_id     INT UNSIGNED   DEFAULT NULL                COMMENT 'FK vers tasks(id) — optionnel',
  uploaded_by INT UNSIGNED   DEFAULT NULL                COMMENT 'FK vers users(id) — celui qui upload',

  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_documents_project (project_id),
  INDEX idx_documents_task (task_id),

  CONSTRAINT fk_documents_project
    FOREIGN KEY (project_id) REFERENCES projects(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_documents_task
    FOREIGN KEY (task_id) REFERENCES tasks(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_documents_uploader
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Documents et fichiers joints';

CREATE TABLE IF NOT EXISTS task_comments (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  task_id     INT UNSIGNED   NOT NULL                    COMMENT 'FK vers tasks(id)',
  user_id     INT UNSIGNED   NOT NULL                    COMMENT 'FK vers users(id)',
  contenu     TEXT           NOT NULL                    COMMENT 'Texte du commentaire',

  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_task_comments_task (task_id),

  CONSTRAINT fk_task_comments_task
    FOREIGN KEY (task_id) REFERENCES tasks(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_task_comments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Commentaires sur les tâches (discussion Kanban)';

CREATE TABLE IF NOT EXISTS direct_messages (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  sender_id   INT UNSIGNED   NOT NULL                    COMMENT 'FK vers users(id) — expéditeur',
  receiver_id INT UNSIGNED   NOT NULL                    COMMENT 'FK vers users(id) — destinataire',
  contenu     TEXT           NOT NULL                    COMMENT 'Corps du message',

  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_dm_sender (sender_id),
  INDEX idx_dm_receiver (receiver_id),
  INDEX idx_dm_conversation (sender_id, receiver_id),

  CONSTRAINT fk_dm_sender
    FOREIGN KEY (sender_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_dm_receiver
    FOREIGN KEY (receiver_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Messages directs entre utilisateurs';

INSERT IGNORE INTO schema_migrations (version) VALUES ('003');
