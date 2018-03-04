const { PureComponent } = require('react')
const h = require('react-hyperscript')
const { DragSource, DropTarget } = require('react-dnd')

const entrySource = {
  beginDrag (props) {
    return {
      id: props.child.get('id')
    }
  }
}

const entryTarget = {
  hover (props, monitor) {
    let draggedId = monitor.getItem().id

    if (draggedId !== props.child.get('id')) {
      props.moveEntry(draggedId, props.child.get('id'), props.col)
    }
  },
  drop (props, monitor) {
    console.log('drop', props, monitor)
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
  )
)
