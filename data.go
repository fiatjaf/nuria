package main

import (
	"strings"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type Entry struct {
	Id       string         `json:"id" db:"id"`
	Key      pq.StringArray `json:"key" db:"key"`
	Members  pq.StringArray `json:"members" db:"members"`
	Tags     pq.StringArray `json:"tags" db:"tags"`
	Name     string         `json:"name" db:"name"`
	Content  string         `json:"content" db:"content"`
	Children pq.StringArray `json:"children" db:"children"`
}

func entriesForUser(pg *sqlx.DB, user string) (entries []string, err error) {
	err = pg.Select(&entries, `
SELECT entry FROM access
INNER JOIN users ON users.id = access.user_id
WHERE users.name = $1
    `, user)
	return
}

func userPicture(pg *sqlx.DB, user string) (pic string, err error) {
	err = pg.Get(&pic, `
SELECT
  CASE WHEN picture IS NOT NULL THEN picture
  ELSE
    CASE WHEN email IS NOT NULL THEN
      'https://www.gravatar.com/avatar/' || md5(email) ||
      '?d=https://robohash.org/' || $1 || '.png'
    ELSE
      'https://robohash.org/' || $1 || '.png'
    END
  END
FROM users WHERE name = $1
    `, user)
	return
}

func fetchEntry(pg *sqlx.DB, user string, entryId string) (entry Entry, err error) {
	err = pg.Get(&entry, `
SELECT
  id        
, name
, key
, content
, tags
, ARRAY(
    SELECT users.name FROM memberships
    INNER JOIN entries AS e ON memberships.entry = entries.id
    INNER JOIN users ON users.id = memberships.member
    WHERE e.id = entries.id AND permission > 1
  ) as members
, ARRAY(
    SELECT child.id FROM entries AS child
    WHERE entries.key = child.key[1:cardinality(entries.key)]
      AND cardinality(child.key) = cardinality(entries.key) + 1
  ) as children
FROM entries WHERE id = $1 AND can_read($2, entries.id);
    `, entryId, user)
	return
}

func createEntry(pg *sqlx.DB, user string, parent string, entry Entry) (err error) {
	_, err = pg.Exec(`
WITH (
  SELECT id, key FROM entries
  WHERE id = $2
   AND can_write($1, entries.id)
) AS parent

INSERT INTO entries (id, key, owner, tags, name, content)
VALUES
( $2
, array_append(SELECT key FROM parent, $2)
, $1
, $3
, $4
, $5
)
    `, user, entry.Id,
		toPGArray(entry.Tags), entry.Name, entry.Content)
	return
}

func updateEntry(pg *sqlx.DB, user string, entry Entry) (err error) {
	_, err = pg.Exec(`
UPDATE entries SET name=$1, content=$2, tags=$3
WHERE id = $5
 AND can_write($4, entries.id)
    `, entry.Name, entry.Content, toPGArray(entry.Tags), user, entry.Id)
	return
}

func toPGArray(arr []string) string {
	return "{" + strings.Join(arr, ",") + "}"
}

func fromPGArray(arr []string) string {
	return "{" + strings.Join(arr, ",") + "}"
}
