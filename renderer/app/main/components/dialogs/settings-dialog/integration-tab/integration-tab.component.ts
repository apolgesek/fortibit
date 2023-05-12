import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ICommunicationService } from '@app/core/models';
import { ConfigService, WorkspaceService } from '@app/core/services';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { CommunicationService } from 'injection-tokens';
import { Subject, take, takeUntil } from 'rxjs';
import { IProduct } from '../../../../../../../product';

@Component({
  selector: 'app-integration-tab',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './integration-tab.component.html',
  styleUrls: ['./integration-tab.component.scss']
})
export class IntegrationTabComponent implements OnInit, OnDestroy {
  public integrationForm: FormGroup;
  public isBiometricsEnabledForCurrentDatabase = false;
  public credentialButtonDisabled = false;
  public isUnlocked = false;
  private readonly destroyed: Subject<void> = new Subject();

  get filePath(): string {
    return this.workspaceService.file?.filePath ?? '';
  }

  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly workspaceService: WorkspaceService,
    private readonly formBuilder: FormBuilder,
    private readonly configService: ConfigService,
  ) { }

  ngOnInit(): void {
    this.configService.configLoadedSource$.pipe(take(1)).subscribe((config) => {
      this.isUnlocked = !this.workspaceService.isLocked;
      this.isBiometricsEnabledForCurrentDatabase = this.isUnlocked && config.biometricsProtectedFiles.includes(this.workspaceService.file?.filePath);
      this.integrationForm = this.formBuilder.group({
        biometricsAuthenticationEnabled: [config.biometricsAuthenticationEnabled],
      });
    });

    this.integrationForm.valueChanges
    .pipe(
      takeUntil(this.destroyed)
    ).subscribe((form) => {
      if (this.integrationForm.valid) {
        const configPartial = {
          biometricsAuthenticationEnabled: form.biometricsAuthenticationEnabled,
        } as Partial<IProduct>;

        this.configService.setConfig(configPartial);
      }
    });
  }

  async toggleBiometrics() {
    this.credentialButtonDisabled = true;
    this.isBiometricsEnabledForCurrentDatabase = !this.isBiometricsEnabledForCurrentDatabase;
    await this.communicationService.ipcRenderer.invoke(IpcChannel.ToggleBiometricsUnlock, this.isBiometricsEnabledForCurrentDatabase);
    this.credentialButtonDisabled = false;
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }
}
