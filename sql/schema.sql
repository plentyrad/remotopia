DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

------------------------------------------------------------
------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('ADMIN', 'MOD', 'MEMBER', 'BANNED');

CREATE TABLE users (
  id             serial PRIMARY KEY,
  uname          text NOT NULL,
  role           user_role NOT NULL DEFAULT 'MEMBER',
  digest         text NOT NULL,
  email          text NULL,
  last_online_at timestamptz NOT NULL DEFAULT NOW(),
  created_at     timestamptz NOT NULL DEFAULT NOW()
);

-- Ensure unames are unique and speed up lower(uname) lookup
CREATE UNIQUE INDEX unique_uname ON users (lower(uname));
-- Speed up lower(email) lookup
CREATE INDEX lower_email ON users (lower(email));

------------------------------------------------------------
------------------------------------------------------------

CREATE TABLE sessions (
  id            uuid PRIMARY KEY,
  user_id       int  NOT NULL REFERENCES users(id),
  ip_address    inet NOT NULL,
  user_agent    text NULL,
  logged_out_at timestamptz NULL,
  expired_at    timestamptz NOT NULL DEFAULT NOW() + INTERVAL '2 weeks',
  created_at    timestamptz NOT NULL DEFAULT NOW()
);

-- Speed up user_id FK joins
CREATE INDEX sessions__user_id ON sessions (user_id);

CREATE VIEW active_sessions AS
  SELECT *
  FROM sessions
  WHERE expired_at > NOW()
    AND logged_out_at IS NULL
;

------------------------------------------------------------
------------------------------------------------------------

CREATE TABLE companies (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  url           text NOT NULL,
  revenue       int NULL,
  year_founded  int NULL,
  avg_salaries  json NULL,
  stack         json NULL,
  tags          json NULL,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);

------------------------------------------------------------
------------------------------------------------------------

CREATE TABLE jobs (
  id            serial PRIMARY KEY,
  company_id    serial NOT NULL,
  title         text NOT NULL,
  type          text NOT NULL,
  description   text NOT NULL,
  contact_email text NOT NULL,
  tags          json NULL,
  approved      int DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX company_id ON jobs (company_id);

------------------------------------------------------------
------------------------------------------------------------

CREATE OR REPLACE FUNCTION ip_root(ip_address inet) RETURNS inet AS 
$$
  DECLARE
    masklen int;
  BEGIN
    masklen := CASE family(ip_address) WHEN 4 THEN 24 ELSE 48 END;
    RETURN host(network(set_masklen(ip_address, masklen)));
  END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE ratelimits (
  id             bigserial        PRIMARY KEY,
  ip_address     inet             NOT NULL,
  created_at     timestamptz      NOT NULL DEFAULT NOW()
);

CREATE INDEX ratelimits__ip_root ON ratelimits (ip_root(ip_address));
