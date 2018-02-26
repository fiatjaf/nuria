package main

import (
	"strings"

	"github.com/jmoiron/sqlx"
)

type Entry struct {
	Id      string   `json:"id"`
	Members []string `json:"members"`
	Tags    []string `json:"tags"`
	Name    string   `json:"name"`
	Content string   `json:"content"`
}

func entriesForUser(pg *sqlx.DB, user string) (entries []string, err error) {
	err = pg.Select(&entries, `
SELECT id FROM entries WHERE key && ARRAY(
  SELECT entry FROM memberships WHERE user_name = $1
)
    `, user)
	return
}

func createEntry(pg *sqlx.DB, user string, parent string, entry Entry) (err error) {
	_, err = pg.Exec(`
WITH (
  SELECT id, key FROM entries
  WHERE id = $2
  AND EXISTS(SELECT * FROM memberships WHERE entry = $1 AND user_name = $2)
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
		pgArray(entry.Tags), entry.Name, entry.Content)
	return
}

func updateEntry(pg *sqlx.DB, user string, entry Entry) (err error) {
	_, err = pg.Exec(`
UPDATE entries SET name=$1, content=$2, tags=$3
WHERE id = $5
AND EXISTS(SELECT * FROM memberships WHERE entry = $5 AND user_name = $4)
    `, entry.Name, entry.Content, pgArray(entry.Tags), user, entry.Id)
	return
}

func pgArray(arr []string) string {
	return "{" + strings.Join(arr, ",") + "}"
}
