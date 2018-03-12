package main // import "github.com/fiatjaf/nuria"

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/jmoiron/sqlx"
	"github.com/jmoiron/sqlx/types"
	_ "github.com/lib/pq"
	"github.com/orcaman/concurrent-map"
	"github.com/rs/zerolog"
)

var subscriptions = cmap.New()
var log = zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).With().Logger()

func main() {
	pg, err := sqlx.Connect("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal().
			Err(err).
			Msg("error connecting to postgres")
	}

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Origin") != "http://"+r.Host {
			http.Error(w, "Origin not allowed", 403)
			return
		}

		conn, err := websocket.Upgrade(w, r, w.Header(), 1024, 1024)
		if err != nil {
			http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
			return
		}

		handle(pg, conn)
	})

	http.HandleFunc("/picture/", func(w http.ResponseWriter, r *http.Request) {
		paths := strings.Split(r.URL.Path, "/")
		user := paths[len(paths)-1]
		pic, err := userPicture(pg, user)

		if err != nil {
			log.Error().
				Err(err).
				Str("user", user).
				Msg("getting user picture")

			http.Error(w, err.Error(), 500)
			return
		}

		w.Header().Set("Cache-Control", "max-age=3600")
		http.Redirect(w, r, pic, 302)
	})

	http.Handle("/", http.FileServer(http.Dir("./")))

	port := os.Getenv("PORT")
	log.Print("listening on port " + port)
	panic(http.ListenAndServe(":"+port, nil))
}

type msg struct {
	Kind       string           `json:"kind"`
	User       string           `json:"user,omitempty"`
	Entry      *Entry           `json:"entry,omitempty"`
	EntryId    string           `json:"id,omitempty"`
	Key        string           `json:"key,omitempty"`
	Value      interface{}      `json:"value,omitempty"`
	Users      []types.JSONText `json:"users,omitempty"`
	Permission int              `json:"permission,omitempty"`
	TargetUser string           `json:"target_user,omitempty"`
}

func handle(pg *sqlx.DB, conn *websocket.Conn) {
	defer conn.Close()

	var user string

	for {
		m := msg{}

		err := conn.ReadJSON(&m)
		if err != nil {
			fmt.Println("Error reading json.", err)

			if entries, err := entriesForUser(pg, user); err != nil {
				log.Warn().
					Str("user", user).
					Err(err).
					Msg("failed to fetch entriesForUser")
			} else {
				for _, entryId := range entries {
					if tmp, ok := subscriptions.Get(entryId); ok {
						conns := tmp.(cmap.ConcurrentMap)
						conns.Remove(user)
					}
				}
			}

			break
		}
		fmt.Printf("Got message: %#v\n", m)

		switch m.Kind {
		case "login":
			user = m.User
			if entries, err := entriesForUser(pg, user); err != nil {
				log.Warn().
					Str("user", user).
					Err(err).
					Msg("failed to fetch entriesForUser")
			} else {
				go func() {
					users, err := allUsers(pg)
					if err != nil {
						log.Warn().
							Err(err).
							Msg("failed to fetch all users")
						return
					}
					err = conn.WriteJSON(msg{Kind: "users", Users: users})
					if err != nil {
						log.Warn().
							Err(err).
							Msg("failed to send all users")
					}
				}()

				for _, entryId := range entries {
					entry, err := fetchEntry(pg, user, entryId)
					if err != nil {
						log.Error().
							Str("entry", entryId).
							Err(err).
							Msg("failed to fetchEntry on login")
						continue
					}
					sendEntry(conn, &entry)

					var conns cmap.ConcurrentMap
					if tmp, ok := subscriptions.Get(entryId); ok {
						conns = tmp.(cmap.ConcurrentMap)
					} else {
						conns = cmap.New()
					}
					conns.Set(user, conn)
					subscriptions.Set(entryId, conns)
				}
			}
			break
		case "update-entry":
			log.Debug().
				Str("entry", m.EntryId).
				Str("user", user).
				Str("what", m.Key).
				Msg("updating")
			err := updateEntry(pg, user, m.EntryId, m.Key, m.Value)
			if err != nil {
				log.Warn().
					Err(err).
					Msg("failed to updateEntry")
				continue
			}

			entry, err := fetchEntry(pg, user, m.EntryId)
			if err != nil {
				log.Error().
					Str("entry", m.EntryId).
					Err(err).
					Msg("failed to fetchEntry on update-entry")
				continue
			}

			if tmp, ok := subscriptions.Get(entry.Id); ok {
				conns := tmp.(cmap.ConcurrentMap)
				for _, iconn := range conns.Items() {
					conn := iconn.(*websocket.Conn)
					sendEntry(conn, &entry)
				}
			}
		case "update-permission":
			log.Debug().
				Str("entry", m.EntryId).
				Str("user", user).
				Msg("updating permission")

			err := setPermission(pg, user, m.EntryId, m.TargetUser, m.Permission)
			if err != nil {
				log.Warn().
					Err(err).
					Str("entry", m.EntryId).
					Str("target", m.TargetUser).
					Int("perm", m.Permission).
					Msg("failed to setPermission")
				continue
			}

			// if the target user is online, find his connection
			var targetConn *websocket.Conn
			if tmp, ok := subscriptions.Get(m.TargetUser); ok {
				for user, iconn := range tmp.(cmap.ConcurrentMap).Items() {
					if user == m.TargetUser {
						targetConn = iconn.(*websocket.Conn)
					}
				}
			}

			// sync this and all entries below this to all users that can access them
			// (and are online, of course) (will also include the target user)
			allentriesbelow, err := fetchAllEntriesBelow(pg, m.EntryId)
			for _, entry := range allentriesbelow {
				if tmp, ok := subscriptions.Get(entry.Id); ok {
					conns := tmp.(cmap.ConcurrentMap)

					// add or remove our new authorized/deauthorized user here
					if targetConn != nil {
						if m.Permission > 0 {
							conns.Set(m.TargetUser, targetConn)
						} else {
							conns.Remove(m.TargetUser)
						}
					}

					for _, iconn := range conns.Items() {
						conn := iconn.(*websocket.Conn)
						sendEntry(conn, &entry)
					}
				}
			}
		case "create-entry":
			log.Debug().
				Str("id", m.Entry.Id).
				Str("key", strings.Join(m.Entry.Key, "/")).
				Msg("creating new entry")
			parentId := m.Entry.Key[len(m.Entry.Key)-2]

			err := createEntry(pg, user, parentId, m.Entry)
			if err != nil {
				log.Error().
					Str("entry", m.Entry.Id).
					Err(err).
					Msg("failed to create-entry")
				continue
			}

			// get everybody that was subscribed to the parent entry,
			// notify them and subscribe them to this entry also.
			if tmp, ok := subscriptions.Get(parentId); ok {
				thisEntryConns := cmap.New()
				for user, iconn := range tmp.(cmap.ConcurrentMap).Items() {
					conn := iconn.(*websocket.Conn)
					thisEntryConns.Set(user, conn)
					sendEntry(conn, m.Entry)
				}
				subscriptions.Set(m.Entry.Id, thisEntryConns)
			}
		case "remove-entry":
			log.Debug().
				Str("id", m.EntryId).
				Msg("removing entry")

			parentId, err := getParentId(pg, m.EntryId)
			if err != nil {
				log.Error().
					Str("entry", m.EntryId).
					Err(err).
					Msg("failed to get parent id")
				continue
			}

			deletedIds, err := removeEntryAndAllDescendants(pg, user, m.EntryId)
			if err != nil {
				log.Error().
					Str("entry", m.EntryId).
					Err(err).
					Msg("failed to remove-entry")
				continue
			}

			// notify all the viewers of the deleted children that they must clean them
			// from their local caches
			for _, deleted := range deletedIds {
				if tmp, ok := subscriptions.Get(deleted); ok {
					for _, iconn := range tmp.(cmap.ConcurrentMap).Items() {
						conn := iconn.(*websocket.Conn)
						err := conn.WriteJSON(msg{Kind: "deleted-entry", EntryId: deleted})
						if err != nil {
							log.Warn().
								Str("deleted", deleted).
								Err(err).
								Msg("failed to send deleted-entry to connection")
						}
					}
					subscriptions.Remove(deleted)
				}
			}

			// notify the parent viewers that this entry (the parent) doesn't have
			// one of his children anymore:
			entry, err := fetchEntry(pg, user, parentId)
			if err != nil {
				log.Error().
					Str("entry", parentId).
					Err(err).
					Msg("failed to fetchEntry (parent) on remove-entry")
				continue
			}

			if tmp, ok := subscriptions.Get(entry.Id); ok {
				conns := tmp.(cmap.ConcurrentMap)
				for _, iconn := range conns.Items() {
					conn := iconn.(*websocket.Conn)
					sendEntry(conn, &entry)
				}
			}
		}
	}
}

func sendEntry(conn *websocket.Conn, entry *Entry) {
	log.Debug().
		Str("entry", entry.Id).
		Msg("sending entry")
	err := conn.WriteJSON(msg{Kind: "entry", Entry: entry})
	if err != nil {
		log.Warn().
			Str("entry", entry.Id).
			Err(err).
			Msg("failed to send entry to connection")
	}
}
