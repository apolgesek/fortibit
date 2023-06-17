export class UiUtil {
  public static readonly constants = {
    unknownElementDraggingClass: 'is-unknown-element-dragging',
    isDraggingClass: 'is-dragging',
    isDraggingOverClass: 'is-dragging-over'
  };

  public static setDragGhost(event: DragEvent) {
    const dataTransfer = event.dataTransfer as DataTransfer;
    dataTransfer.setDragImage(new Image(), 0, 0);
  }

  public static lockInterface() {
    window.addEventListener('keydown', this.lockKeydownEvent);
    document.body.classList.add('lock');
  }

  public static unlockInterface() {
    window.removeEventListener('keydown', this.lockKeydownEvent);
    document.body.classList.remove('lock');
  }

  private static readonly lockKeydownEvent = (event: KeyboardEvent) => {
    event.preventDefault();
  };
}
