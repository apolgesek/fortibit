import { Directive, Input, ElementRef } from '@angular/core';

@Directive({
  selector: '[appTextEmphasize]'
})
export class TextEmphasizeDirective {

  private _searchPhrase: string = '';

  @Input('appTextEmphasize') set searchPhrase(value: string) {
    this._searchPhrase = value;
    this.checkForChanges();
  }

  constructor(private element: ElementRef) { }

  private checkForChanges(): void {
    requestAnimationFrame(() => {
      const elementTextContent = this.element.nativeElement as HTMLElement;
      let newContent: string = elementTextContent.innerHTML
        .replace(new RegExp('<strong>', 'gi'), '')
        .replace(new RegExp('</strong>', 'gi'), '');

      if (this._searchPhrase.length === 0 || !elementTextContent.textContent.includes(this._searchPhrase)) {
        elementTextContent.innerHTML = newContent;
        return;
      }

      newContent = newContent.replace(new RegExp(this._searchPhrase, 'gi'), `<strong>${this._searchPhrase}</strong>`);
      elementTextContent.innerHTML = newContent;

    });
  }

}
