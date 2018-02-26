CREATE TABLE users (
  id serial PRIMARY KEY,
  name text,
  email text
);

CREATE TABLE entries (
  id text PRIMARY KEY,
  key text[] NOT NULL,
  owner int REFERENCES users NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  name text,
  content text,

  CHECK (id = ANY (key))
);
CREATE INDEX ON entries USING GIN(key);

CREATE TABLE normal_memberships (
  entry text REFERENCES entries (id),
  member int REFERENCES users (id)
);

CREATE VIEW memberships AS
  SELECT entry, member AS user_id, users.name AS user_name FROM (
    SELECT entry, member FROM normal_memberships
    UNION
    SELECT id AS entry, owner AS member FROM entries
  )x INNER JOIN users ON users.id = member;

CREATE TABLE comments (
  id serial PRIMARY KEY,
  time timestamp DEFAULT now(),
  commenter int REFERENCES users (id),
  entry text REFERENCES entries (id),
  content text
);

SELECT * FROM entries;






