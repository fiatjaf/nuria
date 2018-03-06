/* global WebSocket */

const {Record, Map, List, Set} = require('immutable')
const cuid = require('cuid')

export const Entry = Record({
  id: null,
  key: [],
  name: '',
  content: '',
  tags: Set(),
  members: Set(),
  children: Set(),
  comments: List(),
  disposition: List(),
  data: {}
})

export const Comment = Record({
  id: null,
  content: '',
  author: ''
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
  let username = window.user.name

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
          tags: Set(entryData.tags || []),
          children: Set(entryData.children || []),
          members: Set(entryData.members || []),
          disposition: List(
            Array.isArray(entryData.disposition)
              ? entryData.disposition
              : []
          )

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

export function newEntry (parentKey, parentDisposition, col) {
  let id = cuid.slug()
  let key = parentKey.concat(id)

  send({
    kind: 'create-entry',
    entry: {id, key}
  })

  parentDisposition[col].unshift(id)
  set(parentKey.slice(-1)[0], ['disposition', parentDisposition])
}

export function set (entryId, [what, value]) {
  send({
    kind: 'update-entry',
    id: entryId,
    key: what,
    value: what === 'disposition'
      ? '{' +
        value
        .filter(col => col.length)
        .map(col => `{${col.join(',')}}`)
        .join(',') +
        '}'
      : what === 'tags'
        ? `{${value.join(',')}}`
        : value.trim()
  })
}

export function addComment (entryId, content) {
  return Promise.resolve('xywytwik')
}
