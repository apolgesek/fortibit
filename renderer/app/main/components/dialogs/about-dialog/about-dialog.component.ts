import { Component, ComponentRef, OnInit } from '@angular/core';
import { ModalRef } from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { take } from 'rxjs';
import { IAppConfig } from '../../../../../../app-config';

@Component({
  selector: 'app-about-dialog',
  templateUrl: './about-dialog.component.html',
  styleUrls: ['./about-dialog.component.scss'],
  standalone: true,
  imports: [
    ModalComponent,
  ]
})
export class AboutDialogComponent implements IModal, OnInit {
  public readonly ref!: ComponentRef<AboutDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  public config: IAppConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly modalRef: ModalRef
  ) {}

  ngOnInit() {
    this.configService.configLoadedSource$.pipe(take(1)).subscribe(config => {
      this.config = config as IAppConfig;
    });
  }

  close() {
    this.modalRef.close();
  }
}
