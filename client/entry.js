const {PureComponent, Component} = require('react')
const h = require('react-hyperscript')
const intersperse = require('intersperse')
const hashbow = require('hashbow')
const ReactTagsInput = require('react-tagsinput')
const enhanceWithClickOutside = require('react-click-outside')

import ReactAutosizeInput from 'react-input-autosize'

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
        h(ListEntries, {
          all_entries: state.get('all_entries'),
          entries: entry.get('children')
        }),
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
