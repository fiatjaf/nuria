const { Component } = require('react')
const h = require('react-hyperscript')
const { DragDropContext } = require('react-dnd')
const HTML5Backend = require('react-dnd-html5-backend')

import ChildEntry from './child-entry'

const requestAnimationFrame = window.requestAnimationFrame
const cancelAnimationFrame = window.cancelAnimationFrame

export default DragDropContext(HTML5Backend)(class extends Component {
  constructor (props) {
    super(props)

    this.moveEntry = this.moveEntry.bind(this)
    this.drawFrame = this.drawFrame.bind(this)

    this.state = {
      entriesByIndex: props.entries.toArray()
    }
  }

  componentWillReceiveProps (props) {
    if (this.props.entries !== props.entries) {
      this.setState({ entriesByIndex: props.entries.toArray() })
    }
  }

  render () {
    let {all_entries} = this.props
    let {entriesByIndex} = this.state

    return (
      h('div#entries', entriesByIndex
        .map(id => all_entries.get(id))
        .filter(x => x)
        .map(child => (
          h(ChildEntry, {
            key: child.get('id'),
            moveEntry: this.moveEntry,
            child
          })
        ))
      )
    )
  }

  moveEntry (id, afterId) {
    var {entriesByIndex} = this.state

    const entryIndex = entriesByIndex.indexOf(id)
    const afterIndex = entriesByIndex.indexOf(afterId)

    this.scheduleUpdate(state => {
      state.entriesByIndex.splice(entryIndex, 1)
      state.entriesByIndex.splice(afterIndex, 0, id)
      return state
    })
  }

  componentWillUnmount () {
    cancelAnimationFrame(this.requestedFrame)
  }

  scheduleUpdate (updateFn) {
    this.pendingUpdateFn = updateFn

    if (!this.requestedFrame) {
      this.requestedFrame = requestAnimationFrame(this.drawFrame)
    }
  }

  drawFrame () {
    this.setState(this.pendingUpdateFn)
    this.pendingUpdateFn = null
    this.requestedFrame = null
  }
})
