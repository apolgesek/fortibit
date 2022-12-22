import { AfterViewInit, Directive, ElementRef, Inject, Input } from '@angular/core';
import { ICommunicationService } from '@app/core/models';
import { EntryManager } from '@app/core/services';
import { CommunicationService } from 'injection-tokens';
import { IPasswordEntry, IpcChannel } from '../../../../shared-models';

@Directive({
  selector: '[appEntryIcon]',
  standalone: true,
})
export class EntryIconDirective implements AfterViewInit {
  private _entry: IPasswordEntry;
  private iconExists = false;

  @Input('appEntryIcon') set entry(value: IPasswordEntry) {
    if (this._entry && this.detailsChanged(value)) {
      this.updateIcon(value);
    }

    this._entry = value;
  };

  constructor(
    private readonly el: ElementRef,
    private readonly entryManager: EntryManager,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService
  ) { }

  async ngAfterViewInit(): Promise<void> {
    // icon check can't be async to avoid load delay
    this.iconExists = Boolean(this._entry.icon);
    this.setIcon(this._entry);
  }

  public async updateIcon(entry: IPasswordEntry) {
    this.iconExists = entry.icon && (entry.icon.startsWith('data') || await this.communicationService.ipcRenderer.invoke(IpcChannel.CheckIconExists, entry.icon));
    await this.setIcon(entry);
  }

  private async setIcon(entry: IPasswordEntry) {
    if (this.iconExists) {
      this.setImageIcon(entry);
    } else {
      this.setInitialIcon(entry);
    }
  }

  private detailsChanged(entry: IPasswordEntry): boolean {
    return this._entry.icon != entry.icon || this._entry.title != entry.title;
  }

  private setImageIcon(entry: IPasswordEntry) {
    (<HTMLImageElement>this.el.nativeElement).src = entry.icon.startsWith('data:image/png') ? entry.icon : 'file://' + entry.icon;
  }

  private setInitialIcon(entry: IPasswordEntry): Promise<number> {
    const dataUrl = this.getDefaultIcon(entry);
    (<HTMLImageElement>this.el.nativeElement).src = dataUrl;

    return this.entryManager.updateIcon(entry.id, dataUrl);
  }

  private getDefaultIcon(entry: IPasswordEntry): string {
    let iconText = '';

    if (entry.title?.trim().length > 0) {
      iconText = entry.title.slice(0, 2);
    }

    return this.createImage(iconText).toDataURL('image/png', 1);
  }

  private createImage(text: string): HTMLCanvasElement {
    const ratio = window.devicePixelRatio;
    const { bgColor, textColor } = this.getBackgroundColor(text);

    var canvas = document.createElement('canvas');

    canvas.width = 32 * ratio;
    canvas.height = 32 * ratio;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    var context = canvas.getContext('2d');
    context.scale(ratio, ratio);

    // draw plane
    context.fillStyle = bgColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // draw text
    const font = text.length > 0 ? 'Arial' : 'primeicons';
    context.font = 'bold 16px ' + font;
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillStyle = textColor;
    context.fillText(text.length > 0 ? text : '\ue939', 16, 10);

    return canvas;
  }

  private getBackgroundColor(text: string): { bgColor: string, textColor: string } {
    switch (text.charCodeAt(0) % 3) {
      case 0:
        // green
        return { bgColor: '#c7e3d0', textColor: '#376d48' };
      case 1:
        // red
        return { bgColor: '#ff9bab', textColor: '#8f3d49'};
      case 2:
        // yellow
        return { bgColor: '#eae48f', textColor: '#9e961d'};
      default:
        return { bgColor: '#ffffff', textColor: '#364f63'};
    }
  }
}
