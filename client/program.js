const { isImmutable, Record, Map } = require('immutable')
const h = require('react-hyperscript')
const { union } = require('tagmeme')

import * as data from './data'
import EntryComponent from './entry'

export default function (init) {
  return {
    init,
    update,
    view
  }
}

export const Model = Record({
  me: '',
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
      var val = state.all_entries.get(state.main_entry).get(what)
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
      () => data.set(state.main_entry, state.editing)
    ],
    'CancelEditing': () => [
      state.set('editing', [null]),
      undefined
    ],
    'SaveDisposition': disposition => [
      state,
      data.set(state.main_entry, ['disposition', disposition])
    ],
    'ToggleComments': () => [
      state.update('show_comments', show => !show),
      undefined
    ],
    'AddComment': content => [
      state,
      () => data.addComment(state.main_entry, content)
    ]
  })
}

function view (state, dispatch) {
  let entry = state.all_entries.get(state.main_entry)
  let [eKey, eVal] = state.editing

  return entry
    ? (
      h(EntryComponent, {state, dispatch, entry, eKey, eVal})
    )
    : (
      h('div', 'loading')
    )
}
