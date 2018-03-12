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
	Id                 string         `json:"id" db:"id"`
	Key                pq.StringArray `json:"key" db:"key"`
	DirectMemberships  types.JSONText `json:"d_m" db:"direct_memberships"`
	ImpliedMemberships types.JSONText `json:"i_m" db:"implied_memberships"`
	Tags               pq.StringArray `json:"tg" db:"tags"`
	Name               string         `json:"nm" db:"name"`
	Content            string         `json:"ct" db:"content"`
	Children           pq.StringArray `json:"chd" db:"children"`
	Arrangement        types.JSONText `json:"arr" db:"arrangement"`
	Data               types.JSONText `json:"dt" db:"data"`
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

func allUsers(pg *sqlx.DB) (users []types.JSONText, err error) {
	err = pg.Select(&users, `
SELECT json_build_object('id', id, 'name', name)
FROM users
    `)
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

func fetchAllEntriesBelow(pg *sqlx.DB, id string) (entries []Entry, err error) {
	err = pg.Select(&entries, `
SELECT `+entryfields+`
FROM entries WHERE $1 = ANY(key)
    `, id)
	return
}

func fetchEntry(pg *sqlx.DB, user string, entryId string) (entry Entry, err error) {
	err = pg.Get(&entry, `
SELECT `+entryfields+`
FROM entries WHERE id = $1 AND can_read($2, entries.id)
    `, entryId, user)
	return
}

func getParentId(pg *sqlx.DB, entryId string) (id string, err error) {
	err = pg.Get(&id, `
SELECT key[cardinality(key) - 1] FROM entries WHERE id = $1
    `, entryId)
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

func setPermission(pg *sqlx.DB, user, entryId, targetUser string, permission int) (err error) {
	_, err = pg.Exec(`
INSERT INTO memberships (entry, member, permission)
SELECT $1, $2, $3
 WHERE can_admin($4, $1)
ON CONFLICT (entry, member) DO UPDATE SET permission = $3
    `, entryId, targetUser, permission, user)
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

func removeEntryAndAllDescendants(pg *sqlx.DB, user, id string) (rem []string, err error) {
	err = pg.Select(&rem, `
DELETE FROM entries
WHERE $1 = ANY(key)
  AND cardinality(key) > 1
  AND can_write($2, entries.id)
RETURNING id
    `, id, user)
	return
}

func toPGArray(arr []string) string {
	return "{" + strings.Join(arr, ",") + "}"
}

func fromPGArray(arr []string) string {
	return "{" + strings.Join(arr, ",") + "}"
}

const entryfields = `
  id
, name
, key
, content
, tags
, (
    SELECT json_agg(json_build_object('u', m.member, 'p', m.permission))
    FROM memberships AS m
    WHERE m.entry = entries.id AND permission > 1
  ) AS direct_memberships
, (
    SELECT json_agg(json_build_object('u', a.member, 'p', a.permission))
    FROM access AS a
    WHERE a.entry = entries.id AND permission > 1
  ) AS implied_memberships
, ARRAY(
    SELECT child.id FROM entries AS child
    WHERE entries.key = child.key[1:cardinality(entries.key)]
      AND cardinality(child.key) = cardinality(entries.key) + 1
  ) AS children
, arrangement
, data
`
