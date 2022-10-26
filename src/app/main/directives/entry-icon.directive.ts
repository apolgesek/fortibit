import { AfterViewInit, Directive, ElementRef, Inject, Input } from '@angular/core';
import { ICommunicationService } from '@app/core/models';
import { CommunicationService } from 'injection-tokens';
import { IPasswordEntry, IpcChannel } from '../../../../shared-models';

@Directive({
  selector: '[appEntryIcon]',
  standalone: true,
})
export class EntryIconDirective implements AfterViewInit {
  private _entry: IPasswordEntry;

  @Input('appEntryIcon') set entry(value: IPasswordEntry) {
    if (this._entry && this.detailsChanged(value)) {
      this.setIcon(this._entry);
    }

    this._entry = value;
  };

  constructor(
    private el: ElementRef,
    @Inject(CommunicationService) private communicationService: ICommunicationService
  ) { }

  ngAfterViewInit(): void {
    const image = this.el.nativeElement as HTMLImageElement;

    image.onerror = () => {
      image.src = this.getDefaultIcon(this._entry);

      if (this._entry.url){
        this.communicationService.ipcRenderer.send(IpcChannel.TryGetIcon, this._entry.id, this._entry.url);
      }
    };

    this.setIcon(this._entry);
  }

  private detailsChanged(entry: IPasswordEntry): boolean {
    return this._entry.iconPath != entry.iconPath || this._entry.title != entry.title;
  }

  private setIcon(entry: IPasswordEntry) {
    const image = this.el.nativeElement as HTMLImageElement;
    image.src = entry.iconPath ? 'file://' + entry.iconPath : this.getDefaultIcon(entry);
  }

  private getDefaultIcon(entry: IPasswordEntry): string {
    let iconText = '';

    if (entry.title?.trim().length > 0) {
      iconText = entry.title.slice(0, 2);
    }

    return this.createImage(iconText.toUpperCase()).toDataURL('image/png', 1);
  }

  private createImage(text: string): HTMLCanvasElement {
    const ratio = window.devicePixelRatio;

    var canvas = document.createElement('canvas');

    canvas.width = 32 * ratio;
    canvas.height = 32 * ratio;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    var context = canvas.getContext('2d');
    context.scale(ratio, ratio);

    const font = text.length > 0 ? 'Arial' : 'primeicons';
    context.font = 'bold 16px ' + font;
    context.textAlign = 'center';
    context.fillStyle = 'transparent';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#87a5ab';
    context.fillText(text.length > 0 ? text : '\ue939', 16, 24);

    return canvas;
  }
}
