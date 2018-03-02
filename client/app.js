const React = require('react')
const {render} = require('react-dom')
const spa = require('raj-spa')
const {program} = require('raj-react')
const Mousetrap = require('mousetrap')

const data = require('./data')
const entryProgram = require('./entry')
const {Model, Msg} = require('./entry')
require('./style.scss')

const history = require('history').createHashHistory()

data.sync(window.user.name)

function main () {
  return React.createElement(
    program(React.Component, () => spa({
      router,
      getRouteProgram,
      initialProgram: getRouteProgram(history.location)
    }))
  )
}

var globalDispatch = () => {}
Mousetrap.bind('esc', () => {
  globalDispatch(Msg.CancelEditing())
})
Mousetrap.bind('enter', () => {
  globalDispatch(Msg.FinishEditing())
})

function getRouteProgram (location) {
  return entryProgram([
    new Model({
      me: window.user.name,
      all_entries: new Map(data.base.entries),
      main_entry: location.pathname.split('/').filter(x => x).slice(-1)[0]
    }),
    dispatch => {
      data.onEntriesUpdated(entries => dispatch(Msg.EntriesUpdated(entries)))
      globalDispatch = dispatch
    }
  ])
}

const router = {
  subscribe () {
    var unlisten = () => {}

    return {
      effect (dispatch) {
        unlisten = history.listen(location => {
          dispatch(location)
        })
      },

      cancel () {
        unlisten()
      }
    }
  }
}

render(main(), document.getElementById('app'))
