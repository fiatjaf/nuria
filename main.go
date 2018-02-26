package main // import "github.com/fiatjaf/nuria"

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gorilla/websocket"
	"github.com/jmoiron/sqlx"
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

	http.Handle("/", http.FileServer(http.Dir("./client")))

	port := os.Getenv("PORT")
	log.Print("listening on port " + port)
	panic(http.ListenAndServe(":"+port, nil))
}

type msg struct {
	Kind  string `json:"kind"`
	User  string `json:"user"`
	Entry Entry  `json:"entry"`
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
				for _, entryId := range entries {
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
				Str("entry", m.Entry.Id).
				Str("user", user).
				Msg("updating")
			err := updateEntry(pg, user, m.Entry)
			if err != nil {
				log.Warn().
					Err(err).
					Msg("failed to updateEntry")
			}

			log.Print(subscriptions.Items())
			if tmp, ok := subscriptions.Get(m.Entry.Id); ok {
				conns := tmp.(cmap.ConcurrentMap)
				for user, iconn := range conns.Items() {
					log.Debug().
						Str("user", user).
						Msg("sending entry")
					conn := iconn.(*websocket.Conn)
					err := conn.WriteJSON(m.Entry)
					if err != nil {
						log.Warn().
							Str("user", user).
							Err(err).
							Msg("failed to send entry to connection")
					}
				}
			}
		}
	}
}
