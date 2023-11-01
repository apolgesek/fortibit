import { AfterViewInit, Directive, ElementRef, Inject, Input } from '@angular/core';
import { IMessageBroker } from '@app/core/models';
import { EntryManager } from '@app/core/services';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';

@Directive({
  selector: '[appEntryIcon]',
  standalone: true,
})
export class EntryIconDirective implements AfterViewInit {
  private _entry: IPasswordEntry;
  private iconExists = false;

  constructor(
    private readonly el: ElementRef,
    private readonly entryManager: EntryManager,
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker
  ) { }

  @Input('appEntryIcon') set entry(value: IPasswordEntry) {
    if (this._entry && this.detailsChanged(value)) {
      this.updateIcon(value);
    }

    this._entry = value;
  };

  async ngAfterViewInit(): Promise<void> {
    // icon check can't be async to avoid load delay
    this.iconExists = Boolean(this._entry.icon);
    this.setIcon(this._entry);
  }

  public async updateIcon(entry: IPasswordEntry) {
    this.iconExists = entry.icon
      && (entry.icon.startsWith('data')
      || await this.messageBroker.ipcRenderer.invoke(IpcChannel.CheckIconExists, entry.icon));
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
    return this._entry.icon !== entry.icon || this._entry.title !== entry.title;
  }

  private setImageIcon(entry: IPasswordEntry) {
    (this.el.nativeElement as HTMLImageElement).src = entry.icon.startsWith('data:image/png')
      ? entry.icon
      : 'file://' + entry.icon;
  }

  private setInitialIcon(entry: IPasswordEntry): Promise<number> {
    const dataUrl = this.getDefaultIcon(entry);
    (this.el.nativeElement as HTMLImageElement).src = dataUrl;

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

    const canvas = document.createElement('canvas');

    canvas.width = 32 * ratio;
    canvas.height = 32 * ratio;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    const context = canvas.getContext('2d');
    context.scale(ratio, ratio);

    // draw plane
    context.fillStyle = bgColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // draw text
    const font = 'Arial';
    context.font = 'bold 16px ' + font;
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillStyle = textColor;
    context.fillText(text.length > 0 ? text : '?', 16, 10);

    return canvas;
  }

  private getBackgroundColor(text: string): { bgColor: string; textColor: string } {
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
