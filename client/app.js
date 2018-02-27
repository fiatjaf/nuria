const {Record, Map} = require('immutable')
const React = require('react')
const {render} = require('react-dom')
const h = require('react-hyperscript')
const {program} = require('raj-react')
const {union} = require('tagmeme')
const hashbow = require('hashbow')
const ReactGridLayout = require('react-grid-layout')

const data = require('./data')
const {User, Comment} = data
require('./style.scss')

function main () {
  return React.createElement(
    program(React.Component, () => ({
      init: [
        new Model({
          me: 'fiatjaf'
        }),
        dispatch => {
          dispatch(Msg.EnterEntry('xyz'))
          data.sync('fiatjaf', entry => {
            dispatch(Msg.GotEntry(entry))
          })
        }
      ],
      update,
      view
    }))
  )
}

const Model = Record({
  me: new User(),
  active_entry: null,
  entries: Map(),
  show_comments: false
})

const Msg = union([
  'EnterEntry',
  'GotEntry',
  'EditEntryName',
  'SetEntryName',
  'ToggleComments',
  'AddComment',
  'AddedComment'
])

function update (msg, state) {
  console.log(msg)
  return Msg.match(msg, {
    'EnterEntry': entryId => [
      state.set('active_entry', entryId),
      undefined
    ],
    'GotEntry': entry => [
      state.setIn(['entries', entry.get('id')], entry),
      undefined
    ],
    'EditEntryName': entryId => [
      state.setIn(['entries', entryId, 'editing_name'], true),
      undefined
    ],
    'SetEntryName': (entryId, name) => [
      state.setIn(['entries', entryId, 'editing_name'], false),
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
  let entry = state.getIn(['entries', state.get('active_entry')])
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
            .map(id => state.getIn(['entries', id]))
            .filter(x => x)
            .map(child => (
              h('div.entry', {
                key: child.get('id'),
                onClick: () => {
                  dispatch(Msg.EnterEntry(child.get('id')))
                }
              }, [
                child.get('editing_name')
                  ? (
                    h('input.name', {
                      value: child.get('name'),
                      onChange: e =>
                        dispatch(Msg.SetEntryName(child.get('id', e.target.value)))
                    })
                  )
                  : (
                    h('.name', {
                      onClick: e => {
                        e.stopPropagation()
                        dispatch(Msg.EditEntryName(child.get('id')))
                      }
                    }, child.get('name'))
                  ),
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

render(main(), document.getElementById('app'))
