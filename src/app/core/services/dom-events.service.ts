import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DomEventsService {
  private renderer: Renderer2;

  constructor(
    private rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document) {    
    this.renderer = this.rendererFactory.createRenderer(null,null);
  }

  createDragGhost(event: DragEvent) {
    let element = null;
    if (process.platform === 'darwin') {
      element = document.createElement('div');
      element.id = 'drag-ghost';
      element.style.position = 'absolute';
      element.style.top = '-1000px';
      document.body.appendChild(element);
    } else {
      element = new Image();
      // transparent image
      element.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    }
    event.dataTransfer.setDragImage(element, 0, 0);

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
  }

  removeDragGhost() {
    if (process.platform === 'darwin') {
      const ghost = this.document.getElementById('drag-ghost');
      this.renderer.removeChild(ghost.parentElement, ghost);
    }
  }
}