import { Directive, Input, ElementRef } from '@angular/core';

@Directive({
  selector: '[appTextEmphasize]'
})
export class TextEmphasizeDirective {

  private _searchPhrase: string = '';

  @Input('appTextEmphasize') set searchPhrase(value: string) {
    this._searchPhrase = value;
    this.checkChanges();
  }

  constructor(private element: ElementRef) { }

  private checkChanges() {
    requestAnimationFrame(() => {
      const elementTextContent = this.element.nativeElement as HTMLElement;
      let newContent: string = elementTextContent.innerHTML
        .replace(new RegExp('<strong>', 'g'), '')
        .replace(new RegExp('</strong>', 'g'), '');

      if (this._searchPhrase.length === 0 || !elementTextContent.textContent.includes(this._searchPhrase)) {
        elementTextContent.innerHTML = newContent;
        return;
      }

      newContent = newContent.replace(new RegExp(this._searchPhrase, 'g'), `<strong>${this._searchPhrase}</strong>`);
      elementTextContent.innerHTML = newContent;
    });
  }

}
