
------------------------------------------------------------
-- Creates first user, password is 'secret'
------------------------------------------------------------

INSERT INTO users (uname, role, digest) VALUES 
 ('admin', 'ADMIN', '$2a$12$3InPKSvlWwgLHYVxvJpaMeXDZF/.hhoiYMv72xydoqm3Pg58Emrwm')
,('test', 'ADMIN', '$2a$12$3InPKSvlWwgLHYVxvJpaMeXDZF/.hhoiYMv72xydoqm3Pg58Emrwm')
;

------------------------------------------------------------
-- Create some companies
------------------------------------------------------------

INSERT INTO companies (name, url) VALUES ('Auth0', 'http://auth0.com');
INSERT INTO companies (name, url) VALUES ('10 Up', 'http://10up.com');

------------------------------------------------------------
------------------------------------------------------------
INSERT INTO jobs (company_id, title, type, description, contact_email)  SELECT id,  'C++ Engineer', 'Engineering', 'Experienced C++ Engineer for unique opportunity!', 'job@10up.com' FROM companies WHERE name = 'Auth0';
