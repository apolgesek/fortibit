import { AfterViewInit, Directive, ElementRef, Inject, Input, OnDestroy } from '@angular/core';
import { CommunicationService } from '@app/app.module';
import { ICommunicationService } from '@app/core/models';
import { IPasswordEntry, IpcChannel } from '../../../../shared-models';

@Directive({
  selector: '[appEntryIcon]',
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
      this.communicationService.ipcRenderer.send(IpcChannel.TryGetIcon, this._entry.id, this._entry.url);
    };

    this.setIcon(this._entry);
  }

  private detailsChanged(entry: IPasswordEntry): boolean {
    return this._entry.iconPath != entry.iconPath || this._entry.title != entry.title;
  }

  private setIcon(entry: IPasswordEntry) {
    const image = this.el.nativeElement as HTMLImageElement;
    image.src = entry.iconPath ?? this.getDefaultIcon(entry);
  }

  private getDefaultIcon(entry: IPasswordEntry): string {
    let icon = '\ue981';

    if (entry.url?.length) {
      icon = '\ue94f';
    }

    const canvas = this.createImage(icon);    

    return canvas.toDataURL('image/png', 1)
  }

  private createImage(text: string = "\ue81f"): HTMLCanvasElement {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    canvas.width = 32;
    canvas.height = 32;
    context.font = "26px primeicons";
    context.textAlign = "center";

    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  
    context.fillStyle = "#65676b";
    context.fillText(text, 16, 28);

    return canvas;
  }
}
