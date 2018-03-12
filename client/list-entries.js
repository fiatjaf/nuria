const { List } = require('immutable')
const { Component } = require('react')
const { DragDropContext, DropTarget } = require('react-dnd')
const HTML5Backend = require('react-dnd-html5-backend')
const h = require('react-hyperscript')

import { Msg } from './program'
import ChildEntry from './child-entry'

export default DragDropContext(HTML5Backend)(class extends Component {
  constructor (props) {
    super(props)

    this.saveArrangement = this.saveArrangement.bind(this)
    this.moveEntry = this.moveEntry.bind(this)
    this.addEntry = this.addEntry.bind(this)
    this.state = {
      arrangement: this.getActualArrangement(props)
    }
  }

  componentWillReceiveProps (props) {
    if (this.props.arrangement !== props.arrangement ||
        this.props.entries !== props.entries) {
      this.setState({
        arrangement: this.getActualArrangement(props)
      })
    }
  }

  getActualArrangement (props) {
    var arrangement = []
    var remaining = props.entries

    props.arrangement.forEach(ids => {
      arrangement.push(ids)

      for (let i = 0; i < ids.length; i++) {
        let id = ids[i]
        remaining = remaining.remove(id)
      }
    })

    arrangement.unshift([])
    arrangement.push(remaining.toArray())

    return arrangement
  }

  shouldComponentUpdate (props, state) {
    if (this.state.arrangement !== state.arrangement) {
      return true
    }

    for (let k in props) {
      if (props[k] !== this.props[k]) return true
    }
    return false
  }

  render () {
    let {all_entries} = this.props
    let {arrangement} = this.state

    return arrangement.map((ids, i) =>
      h(EntryColumn, {
        key: i,
        col: i,
        entries: List(ids)
          .map(id => all_entries.get(id))
          .filter(x => x),
        addEntry: this.addEntry,
        moveEntry: this.moveEntry,
        saveArrangement: this.saveArrangement
      })
    )
  }

  moveEntry (id, afterId, toColumnIndex) {
    var arrangement = this.state.arrangement.slice(0)

    let toColumn = arrangement[toColumnIndex]
    if (!toColumn) {
      toColumn = []
      arrangement.push(toColumn)
    }

    for (let i = 0; i < arrangement.length; i++) {
      let col = arrangement[i]
      let entryIndex = col.indexOf(id)
      if (entryIndex !== -1) {
        col.splice(entryIndex, 1)
      }
    }

    if (afterId === 'last') {
      toColumn.push(id)
    } else {
      let afterIndex = toColumn.indexOf(afterId)
      toColumn.splice(afterIndex, 0, id)
    }

    this.setState({ arrangement })
  }

  addEntry (col) {
    this.props.dispatch(Msg.NewEntry([this.state.arrangement, col]))
  }

  saveArrangement () {
    this.props.dispatch(Msg.SaveArrangement(this.state.arrangement))
  }
})

class EntryColumn extends Component {
  shouldComponentUpdate (nextProps) {
    return !this.props.entries.equals(nextProps.entries)
  }

  render () {
    return (
      h('.entries-column', [
        h('.new', {
          onClick: () => {
            this.props.addEntry(this.props.col)
          }
        }, '+')
      ].concat(
        this.props.entries
        .map(child => (
          h(ChildEntry, {
            key: child.id,
            moveEntry: this.props.moveEntry,
            saveArrangement: this.props.saveArrangement,
            col: this.props.col,
            child
          })
        ))
        .toArray()
      ).concat(
        h(Placeholder, {
          moveEntry: this.props.moveEntry,
          saveArrangement: this.props.saveArrangement,
          col: this.props.col
        })
      ))
    )
  }
}

const columnTarget = {
  hover (props, monitor) {
    let draggedId = monitor.getItem().id
    props.moveEntry(draggedId, 'last', props.col)
  },
  drop (props, monitor) {
    props.saveArrangement()
  }
}

const Placeholder = DropTarget('entry', columnTarget, connect => ({
  connectDropTarget: connect.dropTarget()
}))(
  class extends Component {
    render () {
      let {connectDropTarget} = this.props

      return connectDropTarget(
        h('.placeholder')
      )
    }
  }
)
