import { Component, ComponentRef } from '@angular/core';
import { ConfigService } from '@app/core/services/config.service';
import { ModalService } from '@app/core/services/modal.service';
import { IAdditionalData, IModal } from '@app/shared';
import { IAppConfig } from '../../../../../../app-config';

@Component({
  selector: 'app-about-dialog',
  templateUrl: './about-dialog.component.html',
  styleUrls: ['./about-dialog.component.scss']
})
export class AboutDialogComponent implements IModal {
  public readonly ref!: ComponentRef<AboutDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  public readonly config: IAppConfig;

  constructor(
    private readonly modalService: ModalService,
    private readonly configService: ConfigService
  ) {
    this.config = this.configService.config as IAppConfig;
  }

  close() {
    this.modalService.close(this.ref);
  }
}
