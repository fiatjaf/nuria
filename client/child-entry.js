const { PureComponent } = require('react')
const h = require('react-hyperscript')
const { DragSource, DropTarget } = require('react-dnd')

export class ChildEntry extends PureComponent {
  render () {
    let {child, isDragging, connectDragSource, connectDropTarget} = this.props

    return connectDragSource(
      connectDropTarget(
        h('div.entry', {
          style: {
            visibility: isDragging ? 'hidden' : 'visible'
          }
        }, [
          h('a.name', {
            href: `#/${child.get('key').join('/')}`
          }, child.get('name')),
          h('.content', child.get('content'))
        ])
      )
    )
  }
}

export const cardSource = {
  beginDrag (props) {
    return { id: props.child.get('id') }
  }
}

export const cardTarget = {
  hover (props, monitor) {
    const draggedId = monitor.getItem().id

    if (draggedId !== props.child.get('id')) {
      props.moveEntry(draggedId, props.child.get('id'))
    }
  }
}

export default DropTarget('entry', cardTarget, connect => ({
  connectDropTarget: connect.dropTarget()
}))(
  DragSource('entry', cardSource, (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  }))(ChildEntry)
)
