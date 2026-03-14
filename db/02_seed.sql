-- 02_seed.sql
-- Demo data for local development.
-- Three fictional client accounts with several invoices each.
-- Run automatically by Docker on first start, or manually:
--   mysql -h 127.0.0.1 -u invoices_user -pinvoices_pass invoices_db < db/02_seed.sql
--
-- To generate a JWT for any of these client IDs, run:
--   node scripts/generate-token.js <clientId>
-- Example:
--   node scripts/generate-token.js demo-client-acme

INSERT INTO invoices (client_id, amount, description, created_at) VALUES

  -- ACME Corp (demo-client-acme)
  ('demo-client-acme',   1200.00, 'Brand identity package — logo + style guide',      '2026-01-10 09:00:00'),
  ('demo-client-acme',    350.00, 'Monthly retainer — January 2026',                   '2026-01-31 17:00:00'),
  ('demo-client-acme',    675.50, 'Landing page redesign — Phase 1',                   '2026-02-14 11:30:00'),
  ('demo-client-acme',    350.00, 'Monthly retainer — February 2026',                  '2026-02-28 17:00:00'),
  ('demo-client-acme',   2100.00, 'API integration — Stripe + CRM',                    '2026-03-05 10:00:00'),

  -- Globex LLC (demo-client-globex)
  ('demo-client-globex',  890.00, 'Technical audit report',                            '2026-01-20 14:00:00'),
  ('demo-client-globex', 4500.00, 'Custom dashboard — development + QA',               '2026-02-01 09:00:00'),
  ('demo-client-globex',  200.00, 'Hosting & infrastructure setup',                    '2026-02-15 16:00:00'),
  ('demo-client-globex', 4500.00, 'Custom dashboard — development + QA (milestone 2)', '2026-03-01 09:00:00'),

  -- Initech Ltd (demo-client-initech)
  ('demo-client-initech', 500.00, 'Discovery workshop',                                '2026-02-03 10:00:00'),
  ('demo-client-initech',1800.00, 'Mobile app wireframes — iOS + Android',             '2026-02-20 12:00:00'),
  ('demo-client-initech', 750.00, 'Usability testing & report',                        '2026-03-10 15:00:00');
