import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IMessageBroker } from '@app/core/models';
import { ConfigService, WorkspaceService } from '@app/core/services';
import { IProduct } from '@config/product';
import { IpcChannel } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';
import { take } from 'rxjs';

@Component({
  selector: 'app-integration-tab',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FeatherModule
  ],
  templateUrl: './integration-tab.component.html',
  styleUrls: ['./integration-tab.component.scss']
})
export class IntegrationTabComponent implements OnInit {
  public integrationForm: FormGroup;
  public isBiometricsEnabledForCurrentDatabase = false;
  public credentialButtonDisabled = false;
  public isUnlocked = false;

  constructor(
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
    private readonly workspaceService: WorkspaceService,
    private readonly destroyRef: DestroyRef,
    private readonly formBuilder: FormBuilder,
    private readonly configService: ConfigService,
  ) { }

  get filePath(): string {
    return this.workspaceService.file?.filePath ?? '';
  }

  ngOnInit(): void {
    this.configService.configLoadedSource$.pipe(take(1)).subscribe((config) => {
      this.isUnlocked = !this.workspaceService.isLocked;
      this.isBiometricsEnabledForCurrentDatabase = this.isUnlocked
        && config.biometricsProtectedFiles.includes(this.workspaceService.file?.filePath);
      this.integrationForm = this.formBuilder.group({
        biometricsAuthenticationEnabled: [config.biometricsAuthenticationEnabled],
      });
    });

    this.integrationForm.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef)
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
    await this.messageBroker.ipcRenderer
      .invoke(IpcChannel.ToggleBiometricsUnlock, this.isBiometricsEnabledForCurrentDatabase);
    this.credentialButtonDisabled = false;
  }
}
