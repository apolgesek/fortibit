export class UiUtil {
	public static readonly constants = {
		unknownElementDraggingClass: 'is-unknown-element-dragging',
		isDraggingClass: 'is-dragging',
		isDraggingOverClass: 'is-dragging-over',
	};

	public static setDragGhost(event: DragEvent, element: HTMLElement) {
		const dataTransfer = event.dataTransfer as DataTransfer;
		dataTransfer.setDragImage(element, 0, 0);
	}

	public static lockInterface() {
		window.addEventListener('keydown', this.lockKeydownEvent);
		document.body.classList.add('lock');
	}

	public static unlockInterface() {
		window.removeEventListener('keydown', this.lockKeydownEvent);
		document.body.classList.remove('lock');
	}

	public static focusSearchbox() {
		(document.querySelector('.search') as HTMLInputElement).focus();
	}

	public static isEntryFocused() {
		const activeElement = document.activeElement;
		return activeElement && activeElement.hasAttribute('data-list-entry');
	}

	private static readonly lockKeydownEvent = (event: KeyboardEvent) => {
		event.preventDefault();
	};
}
