CREATE TABLE users (
  id serial PRIMARY KEY,
  name text,
  email text,
  picture text
);

CREATE TABLE entries (
  id text PRIMARY KEY,
  key text[] NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  name text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  disposition text[][] NOT NULL DEFAULT '{}',

  CONSTRAINT id_on_key CHECK (id = key[cardinality(key)])
);
CREATE INDEX ON entries USING GIN(key);

CREATE TABLE memberships (
  entry text REFERENCES entries (id) NOT NULL,
  member int REFERENCES users (id) NOT NULL,
  permission int NOT NULL DEFAULT 0,
  -- 10: admin, 9: normal, 8-3: to be defined, 2: commenter, 1: viewer, 0: no access.

  UNIQUE(entry, member)
);

CREATE VIEW access AS
  SELECT child.id AS entry, member AS user_id, permission FROM entries
  LEFT JOIN entries AS child
    ON entries.key = child.key[1:cardinality(entries.key)]
  LEFT JOIN memberships AS m
    ON entries.id = m.entry;

CREATE FUNCTION can_comment(u text, e text) RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT FROM access INNER JOIN users ON users.name = u
    WHERE access.entry = e AND access.user_id = users.id AND access.permission > 1
  );
$$ LANGUAGE SQL;

CREATE FUNCTION can_read(u text, e text) RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT FROM access INNER JOIN users ON users.name = u
    WHERE access.entry = e AND access.user_id = users.id AND access.permission > 0
  );
$$ LANGUAGE SQL;

CREATE FUNCTION can_write(u text, e text) RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT FROM access INNER JOIN users ON users.name = u
    WHERE access.entry = e AND access.user_id = users.id AND access.permission > 8
  );
$$ LANGUAGE SQL;

CREATE TABLE comments (
  id serial PRIMARY KEY,
  time timestamp DEFAULT now(),
  commenter int REFERENCES users (id),
  entry text REFERENCES entries (id),
  content text
);








