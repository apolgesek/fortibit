export class DomUtils {
  public static createDragGhost(event: DragEvent) {
    const dataTransfer = event.dataTransfer as DataTransfer;

    dataTransfer.setDragImage(new Image(), 0, 0);
    dataTransfer.effectAllowed = 'move';
    dataTransfer.dropEffect = 'move';
  }
}