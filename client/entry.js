const {PureComponent, Component} = require('react')
const {isImmutable, Record, Map} = require('immutable')
const h = require('react-hyperscript')
const {union} = require('tagmeme')
const hashbow = require('hashbow')
const ReactTagsInput = require('react-tagsinput')
const ReactAutosizeInput = require('react-input-autosize').default
const ReactGridLayout = require('react-grid-layout')
const enhanceWithClickOutside = require('react-click-outside')

const data = require('./data')
const {User} = data

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
  show_comments: false,
  editing: [null]
})

module.exports.Model = Model

const Msg = module.exports.Msg = union([
  'EntriesUpdated',
  'StartEditing',
  'Edit',
  'FinishEditing',
  'CancelEditing',
  'ToggleComments',
  'AddComment'
])

function update (msg, state) {
  console.log(msg)
  return Msg.match(msg, {
    'EntriesUpdated': entries => [
      state.set('all_entries', entries),
      undefined
    ],
    'StartEditing': what => {
      var val = state.get('all_entries').get(state.get('main_entry')).get(what)
      if (isImmutable(val)) {
        val = val.toJS()
      }

      return [
        state.set('editing', [what, val]),
        undefined
      ]
    },
    'Edit': tuple => [
      state.set('editing', tuple),
      undefined
    ],
    'FinishEditing': () => [
      state.set('editing', [null]),
      () => data.set(state.get('main_entry'), state.get('editing'))
    ],
    'CancelEditing': () => [
      state.set('editing', [null]),
      undefined
    ],
    'ToggleComments': () => [
      state.update('show_comments', show => !show),
      undefined
    ],
    'AddComment': content => [
      state,
      () => data.addComment(state.get('main_entry'), content)
    ]
  })
}

function view (state, dispatch) {
  console.log(state.toJS())
  let entry = state.get('all_entries').get(state.get('main_entry'))
  let [eKey, eVal] = state.get('editing')

  return entry
    ? (
      h('main', [
        h('div#entry', [
          h('.name', eKey === 'name'
            ? [
              h(EditName, {
                dispatch,
                value: eVal
              })
            ]
            : [
              h('.wrapper', {
                onClick: () => dispatch(Msg.StartEditing('name'))
              }, entry.get('name'))
            ]
          ),
          h('.tags', eKey === 'tags'
            ? [
              h(EditTags, {
                tags: eVal,
                dispatch
              })
            ]
            : [
              h('.wrapper', {
                onClick: () => {
                  dispatch(Msg.StartEditing('tags'))
                }
              }, entry.get('tags')
                .map(t =>
                  h('.tag', {
                    style: {backgroundColor: hashbow(t)}
                  }, t)
                )
                .toArray()
              )
            ]
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
            .map(child => h(ChildEntry, {key: child.get('id'), child}))
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

const EditTags = enhanceWithClickOutside(class extends Component {
  handleClickOutside () {
    this.props.dispatch(Msg.FinishEditing())
  }

  render () {
    return (
      h(ReactTagsInput, {
        value: this.props.tags,
        onChange: tags => {
          this.props.dispatch(Msg.Edit(['tags', tags]))
        },
        addOnPaste: true,
        addOnBlur: true,
        addKeys: [9, 13, 32, 188, 109],
        renderTag: props =>
          h('span.tag', {
            className: props.className,
            key: props.key,
            style: {backgroundColor: hashbow(props.tag)}
          }, [
            props.tag,
            h('a', {
              className: props.classNameRemove,
              onClick: e => {
                props.onRemove(props.key)
              }
            })
          ]),
        renderInput: props =>
          h(ReactAutosizeInput, {
            type: 'text',
            value: props.value,
            onChange: props.onChange,
            className: props.className,
            onBlur: props.onBlur,
            onFocus: props.onFocus,
            onPaste: props.onPaste,
            onKeyDown: e => {
              if (e.which === 27) {
                this.props.dispatch(Msg.CancelEditing())
              } else if (e.which === 13) {
                this.props.dispatch(Msg.FinishEditing())
              } else {
                props.onKeyDown(e)
              }
            }
          })
      })
    )
  }
})

const EditName = enhanceWithClickOutside(class extends Component {
  handleClickOutside () {
    this.props.dispatch(Msg.FinishEditing())
  }

  render () {
    return (
      h('input', {
        value: this.props.value,
        onChange: e => {
          this.props.dispatch(Msg.Edit(['name', e.target.value]))
        },
        onKeyDown: e => {
          if (e.which === 27) {
            this.props.dispatch(Msg.CancelEditing())
          } else if (e.which === 13) {
            this.props.dispatch(Msg.FinishEditing())
          }
        }
      })
    )
  }
})

class ChildEntry extends PureComponent {
  render () {
    let child = this.props.child

    return (
      h('div.entry', [
        h('a.name', {
          href: `#/${child.get('key').join('/')}`
        }, child.get('name')),
        h('.content', child.get('content'))
      ])
    )
  }
}
