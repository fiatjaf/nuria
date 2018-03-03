/* global WebSocket */

const {Record, Map, List, Set} = require('immutable')

export const Entry = Record({
  id: null,
  key: [],
  name: '',
  content: '',
  tags: Set(),
  members: Set(),
  children: Map(),
  comments: List()
})

export const User = Record({
  id: null,
  username: '',
  picture: ''
})

export const Comment = Record({
  id: null,
  content: '',
  author: new User()
})

export var base = {
  entries: Map()
}

var entriesUpdated
export function onEntriesUpdated (fn) {
  entriesUpdated = fn
}

var ws
export function sync (username) {
  ws = new WebSocket(
    location.protocol.replace('http', 'ws') + '//' + location.host + '/ws'
  )
  ws.onerror = function (e) {
    console.error('websocket error', e)
    setTimeout(sync, 1000)
  }
  ws.onmessage = function (e) {
    let m = JSON.parse(e.data)
    console.log('got message', m)
    switch (m.kind) {
      case 'entry':
        let entryData = m.entry
        base.entries = base.entries.set(entryData.id, new Entry({
          id: entryData.id,
          key: entryData.key,
          name: entryData.name,
          content: entryData.content,
          tags: Set(entryData.tags),
          children: List(entryData.children),
          members: Set(entryData.members)

          // data.comments = List(data.comments.map(c => {
          //   c.author = new User(c.author)
          //   return new Comment(c)
          // }))
        }))
        if (entriesUpdated) {
          entriesUpdated(base.entries)
        }

        break
    }
  }
  ws.onopen = function () {
    ws.send(JSON.stringify({kind: 'login', user: username}))
  }
}

export function set (entryId, [what, value]) {
  ws.send(JSON.stringify({
    kind: 'update-entry',
    id: entryId,
    key: what,
    value: what === 'tags' ? `{${value.join(',')}}` : value
  }))
}

export function addComment (entryId, content) {
  return Promise.resolve('xywytwik')
}
