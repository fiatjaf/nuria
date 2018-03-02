/* global WebSocket */

const {Record, Map, List, Set} = require('immutable')

const Entry = Record({
  id: null,
  key: List(),
  name: '',
  content: '',
  tags: Set(),
  members: Set(),
  children: Map(),
  comments: List(),
  layout: [],

  editing_name: false,
  editing_content: false
})

const User = Record({
  id: null,
  username: '',
  picture: ''
})

const Comment = Record({
  id: null,
  content: '',
  author: new User()
})

var base = {
  entries: Map()
}

module.exports.User = User
module.exports.Entry = Entry
module.exports.Comment = Comment
module.exports.sync = sync
module.exports.base = base
module.exports.onEntriesUpdated = onEntriesUpdated

var entriesUpdated
function onEntriesUpdated (fn) {
  entriesUpdated = fn
}

function sync (username) {
  var ws = new WebSocket(
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
          key: List(entryData.key),
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

module.exports.addComment = function addComment (entryId, content) {
  return Promise.resolve('xywytwik')
}
