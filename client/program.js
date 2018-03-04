const {isImmutable, Record, Map} = require('immutable')
const h = require('react-hyperscript')
const {union} = require('tagmeme')

import * as data from './data'
import { User } from './data'
import EntryComponent from './entry'

export default function (init) {
  return {
    init,
    update,
    view
  }
}

export const Model = Record({
  me: new User(),
  main_entry: null,
  all_entries: Map(),
  show_comments: false,
  editing: [null]
})

export const Msg = union([
  'EntriesUpdated',
  'StartEditing',
  'Edit',
  'FinishEditing',
  'CancelEditing',
  'SaveDisposition',
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
    'SaveDisposition': disposition => [
      state,
      data.set(state.get('main_entry'), ['disposition', disposition])
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
  let entry = state.get('all_entries').get(state.get('main_entry'))
  let [eKey, eVal] = state.get('editing')

  return entry
    ? (
      h(EntryComponent, {state, dispatch, entry, eKey, eVal})
    )
    : (
      h('div', 'loading')
    )
}
