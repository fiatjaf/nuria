const {Record, Map, List, Set} = require('immutable')
const React = require('react')
const {render} = require('react-dom')
const h = require('react-hyperscript')
const {program} = require('raj-react')
const {union} = require('tagmeme')
const hashbow = require('hashbow')
const ReactGridLayout = require('react-grid-layout')

const data = require('./data')
require('./style.scss')

function main () {
  return React.createElement(
    program(React.Component, () => ({
      init: [
        new Model({
          me: new User({id: 'fiatjaf', username: 'fiatjaf', picture: 'https://trello-avatars.s3.amazonaws.com/d2f9f8c8995019e2d3fda00f45d939b8/170.png'})
        }),
        dispatch => dispatch(Msg.EnterEntry('banana'))
      ],
      update,
      view
    }))
  )
}

const Entry = Record({
  id: null,
  name: '',
  content: '',
  tags: Set(),
  users: Map(),
  children: Map(),
  comments: List(),
  layout: []
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

const Model = Record({
  me: new User(),
  entry: null,
  children: Map(),
  show_comments: false
})

const Msg = union([
  'EnterEntry',
  'GotEntry',
  'ToggleComments',
  'AddComment',
  'AddedComment'
])

function update (msg, state) {
  console.log(msg)
  return Msg.match(msg, {
    'EnterEntry': entryId => [
      state.set('entry', null),
      dispatch => data.fetchEntry(entryId)
        .then(data => {
          data.tags = Set(data.tags)
          data.children = new Map(data.children.map(ch => {
            ch.tags = Set(ch.tags)
            return [ch.id, new Entry(ch)]
          }))
          data.users = Map(data.users.map(u =>
            [u.id, new User(u)])
          )
          data.comments = List(data.comments.map(c => {
            c.author = new User(c.author)
            return new Comment(c)
          }))

          return new Entry(data)
        })
        .then(entry => dispatch(Msg.GotEntry(entry)))
    ],
    'GotEntry': entry => [
      state.set('entry', entry),
      undefined
    ],
    'ToggleComments': () => [
      state.update('show_comments', show => !show),
      undefined
    ],
    'AddComment': content => [
      state,
      dispatch => data.addComment(state.getIn(['entry', 'id']), content)
        .then(id => {
          let comment = new Comment({
            id,
            content,
            author: state.get('me')
          })
          dispatch(Msg.AddedComment(comment))
        })
    ],
    'AddedComment': comment => [
      state.updateIn(['entry', 'comments'], comments => comments.unshift(comment)),
      undefined
    ]
  })
}

function view (state, dispatch) {
  console.log(state.toJS())
  let entry = state.get('entry')
  return entry
    ? (
      h('main', [
        h('div#entry', [
          h('.name', entry.get('name')),
          h('div', entry.get('tags')
            .map(l => h('.tag', {style: {background: hashbow(l, 28)}}, l))
            .toArray()
          ),
          h('.content', entry.get('content')),
          h('div', entry.get('users')
            .toSeq()
            .valueSeq()
            .map(u => (
              h('div.user', {key: u.get('id')}, [
                h('a', {
                  title: u.get('username')
                }, [
                  h('img', {src: u.get('picture')})
                ])
              ])
            ))
            .toArray()
          )
        ]),
        h('div#entries', [
          h(ReactGridLayout, {
            rowHeight: 77,
            layout: entry.get('layout'),
            cols: 12,
            width: 1000
          }, entry.get('children')
            .toSeq()
            .valueSeq()
            .map(v => (
              h('div.entry', {key: v.get('id')}, [
                h('.name', v.get('name')),
                h('.content', v.get('content'))
              ])
            ))
            .toArray()
          )
        ]),
        h('a#comment-handle', {
          className: state.get('show_comments') ? 'is-open' : '',
          onClick: () => dispatch(Msg.ToggleComments())
        }, state.get('show_comments') ? '>>>' : '<<<'),
        h('div#comments', {
          className: state.get('show_comments') ? '' : 'hidden'
        }, [
          h('form#comment-box', {
            onSubmit: e => {
              e.preventDefault()
              dispatch(Msg.AddComment(e.target.content.value))
            }
          }, [
            h('div', [
              h('textarea', {name: 'content'})
            ]),
            h('div', [
              h('button', 'Send comment')
            ])
          ]),
          entry.get('comments')
            .map(c => (
              h('div.comment', {key: c.get('id')}, [
                h('div', [
                  h('img', {src: c.getIn(['author', 'picture'])})
                ]),
                h('div', [
                  h('.author', c.getIn(['author', 'username'])),
                  h('.content', c.get('content'))
                ])
              ])
            ))
            .toArray()
        ])
      ])
    )
    : (
      h('div', 'loading')
    )
}

render(main(), document.getElementById('app'))
