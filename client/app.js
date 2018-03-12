const React = require('react')
const { render } = require('react-dom')
const spa = require('raj-spa')
const { program } = require('raj-react')
const Mousetrap = require('mousetrap')

require('./style.scss')

import * as data from './data'
import entryProgram, { Model, Msg } from './program'

const history = require('history').createHashHistory()

data.sync()
var globalDispatch = () => {}

function main () {
  return React.createElement(
    program(React.Component, () => spa({
      router,
      getRouteProgram,
      initialProgram: getRouteProgram(history.location)
    }))
  )
}

function getRouteProgram (location) {
  return entryProgram([
    new Model({
      me: window.user.name,
      all_entries: data.base.entries,
      all_users: data.base.users,
      main_entry: location.pathname.split('/').filter(x => x).slice(-1)[0] ||
        window.user.id
    }),
    dispatch => {
      data.setDispatcher(dispatch)
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

Mousetrap.bind('del', () => {
  let entry = document.querySelector('.entry:hover')
  if (entry) return globalDispatch(Msg.RemoveEntry([entry.id, false]))
  let member = document.querySelector('.users .user:hover')
  if (member) return globalDispatch(Msg.RemoveMember(member.id))
})
