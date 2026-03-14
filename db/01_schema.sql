-- 01_schema.sql
-- Creates the invoices table.
-- Run automatically by Docker on first start, or manually:
--   mysql -h 127.0.0.1 -u invoices_user -pinvoices_pass invoices_db < db/01_schema.sql

CREATE TABLE IF NOT EXISTS invoices (
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  client_id   VARCHAR(128)     NOT NULL,
  amount      DECIMAL(12, 2)   NOT NULL,
  description VARCHAR(500)     NOT NULL,
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_client_id (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
