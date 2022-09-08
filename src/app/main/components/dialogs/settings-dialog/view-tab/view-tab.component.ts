import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CommunicationService } from '@app/app.module';
import { ICommunicationService } from '@app/core/models';
import { ConfigService } from '@app/core/services';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { Subject, take, takeUntil } from 'rxjs';
import { IProduct } from '../../../../../../../product';

@Component({
  selector: 'app-view-tab',
  templateUrl: './view-tab.component.html',
  styleUrls: ['./view-tab.component.scss']
})
export class ViewTabComponent implements OnInit {
  public viewForm: FormGroup;
  private readonly destroyed: Subject<void> = new Subject();

  constructor(
    private readonly formBuilder: FormBuilder,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly configService: ConfigService,
  ) { }

  ngOnInit(): void {
    this.configService.configLoadedSource$.pipe(take(1)).subscribe((config) => {
      this.viewForm = this.formBuilder.group({
        displayIcons: [config.displayIcons]
      });

      this.viewForm.valueChanges
      .pipe(
        takeUntil(this.destroyed)
      ).subscribe((form) => {
        if (this.viewForm.valid) {
          const configPartial = {
            displayIcons: form.displayIcons
          } as Partial<IProduct>;
  
          this.communicationService.ipcRenderer.send(IpcChannel.ChangeEncryptionSettings, configPartial);
          this.configService.setConfig(configPartial);
        }
      });
    });
  }
}