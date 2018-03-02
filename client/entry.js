const {Record, Map} = require('immutable')
const h = require('react-hyperscript')
const {union} = require('tagmeme')
const hashbow = require('hashbow')
const ReactGridLayout = require('react-grid-layout')

const data = require('./data')
const {User, Comment} = data

module.exports = function (init) {
  return {
    init,
    update,
    view
  }
}

const Model = Record({
  me: new User(),
  main_entry: null,
  all_entries: Map(),
  show_comments: false
})

module.exports.Model = Model

const Msg = module.exports.Msg = union([
  'EntriesUpdated',
  'EditName',
  'SetName',
  'ToggleComments',
  'AddComment',
  'AddedComment'
])

function update (msg, state) {
  console.log(msg)
  return Msg.match(msg, {
    'EntriesUpdated': entries => [
      state.set('all_entries', entries),
      undefined
    ],
    'EditName': entryId => [
      state.setIn(['all_entries', entryId, 'editing_name'], true),
      undefined
    ],
    'SetName': (entryId, name) => [
      state.setIn(['all_entries', entryId, 'editing_name'], false),
      dispatch => data.setEntryName(entryId, name)
        .then()
        .catch(console.log)
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
  let entry = state.get('all_entries').get(state.get('main_entry'))
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
          h('div', entry.get('members')
            .toSeq()
            .map(name => (
              h('div.user', {key: name}, [
                h('a', {
                  title: name
                }, [
                  h('img', {src: `/picture/${name}`})
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
            .map(id => state.get('all_entries').get(id))
            .filter(x => x)
            .map(child => (
              h('div.entry', {
                key: child.get('id')
              }, [
                h('a.name', {
                  href: `#/${child.get('key').join('/')}`
                }, child.get('name')),
                h('.content', child.get('content'))
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
