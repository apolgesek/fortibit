export class DomUtil {
  public static readonly constants = {
    unknownElementDraggingClass: 'is-unknown-element-dragging',
    isDraggingClass: 'is-dragging'
  };

  public static setDragGhost(event: DragEvent) {
    const dataTransfer = event.dataTransfer as DataTransfer;
    dataTransfer.setDragImage(new Image(), 0, 0);
  }
}