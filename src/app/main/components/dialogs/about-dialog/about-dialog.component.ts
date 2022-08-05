import { Component, ComponentRef } from '@angular/core';
import { ModalManager } from '@app/core/services/modal-manager';
import { ConfigService } from '@app/core/services/config.service';
import { IAdditionalData, IModal } from '@app/shared';
import { IAppConfig } from '../../../../../../app-config';
import { take } from 'rxjs';

@Component({
  selector: 'app-about-dialog',
  templateUrl: './about-dialog.component.html',
  styleUrls: ['./about-dialog.component.scss']
})
export class AboutDialogComponent implements IModal {
  public readonly ref!: ComponentRef<AboutDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  public config: IAppConfig;

  constructor(
    private readonly modalManager: ModalManager,
    private readonly configService: ConfigService
  ) {}

  ngOnInit() {
    this.configService.configLoadedSource$.pipe(take(1)).subscribe(config => {
      this.config = config as IAppConfig;
    });
  }

  close() {
    this.modalManager.close(this.ref);
  }
}
