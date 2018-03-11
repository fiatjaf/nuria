const { isImmutable, Record, Map, Set } = require('immutable')
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
  all_users: Set(),
  show_comments: false,
  editing: [null],
  adding_member: [null, 9]
})

export const Msg = union([
  'EntriesUpdated',
  'UsersUpdated',
  'NewEntry',
  'StartEditing',
  'Edit',
  'FinishEditing',
  'CancelEditing',
  'StartAddingMember',
  'AddMemberEdit',
  'FinishAddingMember',
  'CancelAddingMember',
  'SaveArrangement',
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
    'UsersUpdated': users => [
      state.set('all_users', users),
      undefined
    ],
    'NewEntry': ([arrangement, col]) => [
      state,
      () => data.newEntry(
        state.all_entries.get(state.main_entry).key,
        arrangement,
        col
      )
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
    'StartAddingMember': () => [
      state.set('adding_member', ['', state.adding_member[1]]),
      undefined
    ],
    'AddMemberEdit': ([what, value]) => [
      state.set('adding_member', what === 'name'
        ? [value, state.adding_member[1]]
        : [state.adding_member[0], value]),
      undefined
    ],
    'FinishAddingMember': () => [
      state.set('adding_member', [null, state.adding_member[1]]),
      data.addMember(state.main_entry, state.adding_member)
    ],
    'CancelAddingMember': () => [
      state.set('adding_member', [null, state.adding_member[1]]),
      undefined
    ],
    'SaveArrangement': arrangement => [
      state,
      data.set(state.main_entry, ['arrangement', arrangement])
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
