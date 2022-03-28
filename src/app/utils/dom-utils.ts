export class DomUtils {
  public static readonly constants = {
    unknownElementDraggingClass: 'is-unknown-element-dragging'
  };

  public static setDragGhost(event: DragEvent) {
    const dataTransfer = event.dataTransfer as DataTransfer;
    dataTransfer.setDragImage(new Image(), 0, 0);
  }
}