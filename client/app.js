const {Record, Map} = require('immutable')
const React = require('react')
const {render} = require('react-dom')
const h = require('react-hyperscript')
const {program} = require('raj-react')
const {union} = require('tagmeme')

function main () {
  return React.createElement(
    program(React.Component, () => ({
      init,
      update,
      view
    }))
  )
}

const Maybe = union([
  'Just',
  'Nothing'
])

const Model = Record({
  entry: Maybe.Nothing(),
  children: Map()
})

const Entry = Record({
  id: '',
  name: '',
  children: Map()
})

const init = [
  new Model(),
  dispatch => dispatch(Msg.EnterEntry('banana'))
]

const Msg = union([
  'EnterEntry',
  'GotEntry'
])

function update (msg, state) {
  return Msg.match(msg, {
    'EnterEntry': entryId => [
      state.set('entry', Maybe.Nothing()),
      dispatch => Promise.resolve({id: entryId, name: entryId, children: [
        {name: 'x', id: 'x'},
        {name: 'y', id: 'y'}
      ]})
        .then(data => {
          data.children = new Map(
            data.children.map(ch => [ch.id, new Entry(ch)])
          )
          return new Entry(data)
        })
        .then(entry => dispatch(Msg.GotEntry(entry)))
    ],
    'GotEntry': entry => [
      state.set('entry', Maybe.Just(entry)),
      undefined
    ]
  })
}

function view (state, dispatch) {
  return Maybe.match(state.get('entry'), {
    'Nothing': () => (
      h('div', 'loading')
    ),
    'Just': entry => (
      h('main', [
        h('div#data', [
          h('h1', entry.get('name'))
        ]),
        h('div#entries', entry.get('children')
          .toSeq()
          .valueSeq()
          .map(v => (
            h('div', [
              h('h1', v.get('name'))
            ])
          ))
          .toArray()
        ),
        h('div#comments', [])
      ])
    )
  })
}

render(main(), document.getElementById('app'))
