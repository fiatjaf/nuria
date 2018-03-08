/* global WebSocket */

const {Record, Map, List, Set} = require('immutable')
const cuid = require('cuid')

export const Entry = Record({
  id: null,
  key: [],
  name: '',
  content: '',
  tags: Set(),
  direct_memberships: List(),
  implied_memberships: List(),
  children: Set(),
  comments: List(),
  arrangement: List(),
  data: {}
})

export const Comment = Record({
  id: null,
  content: '',
  author: ''
})

export const Membership = Record({
  user: '',
  permission: 0
})

export var base = {
  entries: Map()
}

var entriesUpdated
export function onEntriesUpdated (fn) {
  entriesUpdated = fn
}

var ws
export function sync () {
  let user = window.user.id

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
          name: entryData.nm,
          content: entryData.ct,
          tags: Set(entryData.tg || []),
          children: Set(entryData.chd || []),
          direct_memberships: Set(
            (Array.isArray(entryData.d_m) ? entryData.d_m : [])
            .map(({u, p}) => new Membership({
              user: u,
              permission: p
            }))
          ),
          implied_memberships: Set(
            (Array.isArray(entryData.i_m) ? entryData.i_m : [])
            .map(({u, p}) => new Membership({
              user: u,
              permission: p
            }))
          ),
          arrangement: List(entryData.arr || [])

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
    ws.send(JSON.stringify({kind: 'login', user: user}))
  }
}

function send (jsonMessage) {
  if (ws.readyState > WebSocket.OPEN) {
    setTimeout(sync, 1)
  }
  if (ws.readyState !== WebSocket.OPEN) {
    setTimeout(send, 1000, jsonMessage)
    return
  }

  ws.send(JSON.stringify(jsonMessage))
}

export function newEntry (parentKey, parentArrangement, col) {
  let id = cuid.slug()
  let key = parentKey.concat(id)

  send({
    kind: 'create-entry',
    entry: {id, key}
  })

  parentArrangement[col].unshift(id)
  set(parentKey.slice(-1)[0], ['arrangement', parentArrangement])
}

export function set (entryId, [what, value]) {
  send({
    kind: 'update-entry',
    id: entryId,
    key: what,
    value: what === 'arrangement'
      ? value.filter(x => x.length)
      : what === 'tags'
        ? `{${value.join(',')}}`
        : value.trim()
  })
}

export function addComment (entryId, content) {
  return Promise.resolve('xywytwik')
}
