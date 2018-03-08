package main

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/jmoiron/sqlx"
	"github.com/jmoiron/sqlx/types"
	"github.com/lib/pq"
)

type Entry struct {
	Id          string         `json:"id" db:"id"`
	Key         pq.StringArray `json:"key" db:"key"`
	Members     pq.StringArray `json:"members" db:"members"`
	Tags        pq.StringArray `json:"tags" db:"tags"`
	Name        string         `json:"name" db:"name"`
	Content     string         `json:"content" db:"content"`
	Children    pq.StringArray `json:"children" db:"children"`
	Arrangement types.JSONText `json:"arrangement" db:"arrangement"`
	Data        types.JSONText `json:"data" db:"data"`
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
FROM users WHERE id = $1
    `, user)
	return
}

func entriesForUser(pg *sqlx.DB, user string) (entries []string, err error) {
	err = pg.Select(&entries, `
SELECT entry FROM access
WHERE member = $1
    `, user)
	entries = append(entries, user)
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
    SELECT users.id FROM memberships
    INNER JOIN entries AS e ON memberships.entry = entries.id
    INNER JOIN users ON users.id = memberships.member
    WHERE e.id = entries.id AND permission > 1
  ) as members
, ARRAY(
    SELECT child.id FROM entries AS child
    WHERE entries.key = child.key[1:cardinality(entries.key)]
      AND cardinality(child.key) = cardinality(entries.key) + 1
  ) as children
, arrangement
, data
FROM entries WHERE id = $1 AND can_read($2, entries.id);
    `, entryId, user)
	return
}

func updateEntry(pg *sqlx.DB, user, entryId, key string, value interface{}) (err error) {
	if key == "arrangement" {
		value, _ = json.Marshal(value)
	} else if key != "name" && key != "content" && key != "tags" {
		return errors.New("unnalowed property: " + key)
	}

	_, err = pg.Exec(`
UPDATE entries SET `+key+`=$1
WHERE id = $2
  AND can_write($3, entries.id)
    `, value, entryId, user)
	return
}

func createEntry(pg *sqlx.DB, user, parent string, entry *Entry) (err error) {
	err = pg.Get(entry, `
INSERT INTO entries (id, key)
SELECT $1, $2
 WHERE can_write($3, $4)
RETURNING *
    `, entry.Id, entry.Key, user, parent)
	return
}

func toPGArray(arr []string) string {
	return "{" + strings.Join(arr, ",") + "}"
}

func fromPGArray(arr []string) string {
	return "{" + strings.Join(arr, ",") + "}"
}
