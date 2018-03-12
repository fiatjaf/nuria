const { PureComponent } = require('react')
const h = require('react-hyperscript')
const { DragSource, DropTarget } = require('react-dnd')

const entrySource = {
  beginDrag (props, _, component) {
    return {
      id: props.child.id
    }
  }
}

const entryTarget = {
  hover (props, monitor) {
    let draggedId = monitor.getItem().id

    if (draggedId !== props.child.id) {
      props.moveEntry(draggedId, props.child.id, props.col)
    }
  },
  drop (props, monitor) {
    props.saveArrangement()
  }
}

export default DropTarget('entry', entryTarget, connect => ({
  connectDropTarget: connect.dropTarget()
}))(
  DragSource('entry', entrySource, (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  }))(
    class extends PureComponent {
      render () {
        let {child, isDragging, connectDragSource, connectDropTarget} = this.props

        return connectDragSource(
          connectDropTarget(
            h('a.entry', {
              id: child.id,
              style: {
                visibility: isDragging ? 'hidden' : 'visible'
              },
              href: `#/${child.key.join('/')}`
            }, [
              h('span.name', child.name),
              h('.content', child.content.slice(0, 300))
            ])
          )
        )
      }
    }
  )
)
