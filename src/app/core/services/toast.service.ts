import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { IToastModel } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private renderer: Renderer2;
  private toasts: HTMLElement[] = [];

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private rendererFactory: RendererFactory2
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  add(model: IToastModel) {
    this.toasts.forEach((el) => {
      el.remove();
    });

    this.toasts = [];

    const toastContainer: HTMLElement = this.renderer.createElement('div');

    toastContainer.textContent = model.message;
    toastContainer.classList.add('hs-toast');
    toastContainer.classList.add(model.type);
    toastContainer.setAttribute('data-prevent-entry-deselect', '');

    const stopwatch: HTMLElement = this.renderer.createElement('div');
  
    stopwatch.textContent = (model.alive / 1000).toString();
    stopwatch.classList.add('seconds-left');

    this.renderer.appendChild(toastContainer, stopwatch);

    let count = model.alive;
    const interval = setInterval(() => {
      if (count === 1000) {
        clearInterval(interval);

        return;
      }
      count -= 1000;
      stopwatch.textContent = (count / 1000).toString();
    }, 1000);

    this.renderer.appendChild(this.document.body, toastContainer);

    toastContainer.addEventListener('click', () => {
      clearInterval(interval);

      toastContainer.remove();
      this.removeToast(toastContainer);
    });

    this.toasts.push(toastContainer);

    setTimeout(() => {
      toastContainer.remove();
      this.removeToast(toastContainer);
    }, model.alive);

    requestAnimationFrame(() => {
      toastContainer.classList.add('animate');
    });
  }

  private removeToast(el: HTMLElement) {
    const elIndex = this.toasts.findIndex(x => x === el);
    this.toasts.splice(elIndex, 1);
  }
}
