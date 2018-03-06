const {PureComponent, Component} = require('react')
const intersperse = require('intersperse')
const enhanceWithClickOutside = require('react-click-outside')
const hashbow = require('hashbow')
const h = require('react-hyperscript')
const ReactAutosizeInput = require('react-input-autosize').default
const TextareaAutosize = require('react-autosize-textarea').default
const ReactTagsInput = require('react-tagsinput')

import { Msg } from './program'
import ListEntries from './list-entries'

export default class Entry extends PureComponent {
  render () {
    let {state, dispatch, entry, eKey, eVal} = this.props

    return (
      h('main', [
        h('div#entry', [
          h('.key', intersperse(entry.key
            .map((id, i) =>
              h('a.partial-id', {
                href: '#/' + entry.key.slice(0, i + 1).join('/')
              }, id)
            ), h('span.separator', '/')
          )),
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
              }, entry.name)
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
              }, entry.tags
                .map(t =>
                  h('.tag', {
                    style: {backgroundColor: hashbow(t)}
                  }, t)
                )
                .toArray()
              )
            ]
          ),
          h('.content', {
            className: eKey !== 'content' &&
              entry.content === '' &&
              'empty'
          }, eKey === 'content'
            ? [
              h(EditContent, {
                dispatch,
                value: eVal
              })
            ]
            : [
              h('.wrapper', {
                onClick: () => dispatch(Msg.StartEditing('content'))
              }, entry.content)
            ]
          ),
          h('.users', entry.members
            .toSeq()
            .map(name => (
              h('.user', {key: name}, [
                h('a', {
                  title: name,
                  href: '#/' + name
                }, [
                  h('img', {src: `/picture/${name}`})
                ])
              ])
            ))
            .toArray()
          )
        ]),
        h('#entries', [
          h(ListEntries, {
            dispatch,
            entries: entry.children,
            disposition: entry.disposition,
            all_entries: state.all_entries
          })
        ]),
        h('a#comment-handle', {
          className: state.show_comments ? 'is-open' : '',
          onClick: () => dispatch(Msg.ToggleComments())
        }, state.show_comments ? '>>>' : '<<<'),
        h('div#comments', {
          className: state.show_comments ? '' : 'hidden'
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
          entry.comments
            .map(c => (
              h('div.comment', {key: c.id}, [
                h('div', [
                  h('img', {src: c.getIn(['author', 'picture'])})
                ]),
                h('div', [
                  h('.author', c.getIn(['author', 'username'])),
                  h('.content', c.content)
                ])
              ])
            ))
            .toArray()
        ])
      ])
    )
  }
}

export const EditTags = enhanceWithClickOutside(class extends Component {
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

export const EditName = enhanceWithClickOutside(class extends Component {
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
        ref: el => el ? el.focus() : null,
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

export const EditContent = enhanceWithClickOutside(class extends Component {
  handleClickOutside () {
    this.props.dispatch(Msg.FinishEditing())
  }

  render () {
    return (
      h(TextareaAutosize, {
        value: this.props.value,
        onChange: e => {
          this.props.dispatch(Msg.Edit(['content', e.target.value]))
        },
        ref: el => el ? el.textarea.focus() : null,
        onKeyDown: e => {
          if (e.which === 27) {
            this.props.dispatch(Msg.CancelEditing())
          }
        }
      })
    )
  }
})
