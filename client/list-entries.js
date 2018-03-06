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

    this.saveDisposition = this.saveDisposition.bind(this)
    this.moveEntry = this.moveEntry.bind(this)
    this.addEntry = this.addEntry.bind(this)
    this.state = {
      disposition: this.getActualDisposition(props)
    }
  }

  componentWillReceiveProps (props) {
    if (this.props.disposition !== props.disposition) {
      this.setState({
        disposition: this.getActualDisposition(props)
      })
    }
  }

  getActualDisposition (props) {
    var disposition = []
    var remaining = props.entries

    props.disposition.forEach(ids => {
      disposition.push(ids)

      for (let i = 0; i < ids.length; i++) {
        let id = ids[i]
        remaining = remaining.remove(id)
      }
    })

    disposition.unshift([])
    disposition.push(remaining.toArray())

    return disposition
  }

  shouldComponentUpdate (props, state) {
    if (this.state.disposition !== state.disposition) {
      return true
    }

    for (let k in props) {
      if (props[k] !== this.props[k]) return true
    }
    return false
  }

  render () {
    let {all_entries} = this.props
    let {disposition} = this.state

    return disposition.map((ids, i) =>
      h(EntryColumn, {
        key: i,
        col: i,
        entries: List(ids)
          .map(id => all_entries.get(id))
          .filter(x => x),
        addEntry: this.addEntry,
        moveEntry: this.moveEntry,
        saveDisposition: this.saveDisposition
      })
    )
  }

  moveEntry (id, afterId, toColumnIndex) {
    var disposition = this.state.disposition.slice(0)

    let toColumn = disposition[toColumnIndex]
    if (!toColumn) {
      toColumn = []
      disposition.push(toColumn)
    }

    let afterIndex = toColumn.indexOf(afterId)

    for (let i = 0; i < disposition.length; i++) {
      let col = disposition[i]
      let entryIndex = col.indexOf(id)
      if (entryIndex !== -1) {
        col.splice(entryIndex, 1)
      }
    }
    toColumn.splice(afterIndex, 0, id)

    this.setState({ disposition })
  }

  addEntry (col) {
    this.props.dispatch(Msg.NewEntry([this.state.disposition, col]))
  }

  saveDisposition () {
    this.props.dispatch(Msg.SaveDisposition(this.state.disposition))
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
      ].concat(this.props.entries.isEmpty()
        ? h(Placeholder, {
          moveEntry: this.props.moveEntry,
          saveDisposition: this.props.saveDisposition,
          col: this.props.col
        })
        : this.props.entries
          .map(child => (
            h(ChildEntry, {
              key: child.get('id'),
              moveEntry: this.props.moveEntry,
              saveDisposition: this.props.saveDisposition,
              col: this.props.col,
              child
            })
          ))
          .toArray()
      ))
    )
  }
}

const columnTarget = {
  hover (props, monitor) {
    let draggedId = monitor.getItem().id
    props.moveEntry(draggedId, 0, props.col)
  },
  drop (props, monitor) {
    props.saveDisposition()
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
