import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GroupId } from '@app/core/enums';
import { IMessageBroker } from '@app/core/models';
import { EntryManager, GroupManager, ModalService, WorkspaceService } from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
import { AutofocusDirective } from '@app/shared/directives/autofocus.directive';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { UiUtil } from '@app/utils';
import { IAppConfig } from '@config/app-config';
import { IpcChannel } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { tips } from '../../../../assets/data/tips';
import { ShowPasswordIconComponent } from '@app/shared/components/show-password-icon/show-password-icon.component';

@Component({
  selector: 'app-master-password',
  templateUrl: './master-password.component.html',
  styleUrls: ['./master-password.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FeatherModule,
    AutofocusDirective,
    TooltipDirective,
    ShowPasswordIconComponent
  ]
})
export class MasterPasswordComponent implements OnInit, OnDestroy {
  public loginForm: FormGroup;
  public config: IAppConfig;
  public errorMessage: string;
  public passwordVisible = false;
  public oneOfTips = '';

  private readonly defaultGroup = GroupId.AllItems;

  private onDecryptedContent: (_: any, { decrypted }: { decrypted: string }) => void;
  private _filePath: string;

  constructor(
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
    private readonly workspaceService: WorkspaceService,
    private readonly groupManager: GroupManager,
    private readonly entryManager: EntryManager,
    private readonly fb: FormBuilder,
    private readonly zone: NgZone,
    private readonly route: ActivatedRoute,
    private readonly configService: ConfigService,
    private readonly modalService: ModalService,
    private readonly destroyRef: DestroyRef,
  ) {
    this.loginForm = this.fb.group({
      password: ['', Validators.required]
    });

    this.onDecryptedContent = (_, { decrypted, error }: { decrypted: string; error: string }) => {
      this.zone.run(async () => {
        if (decrypted && !error) {
          this.workspaceService.setSynced();
          await this.workspaceService.loadVault(decrypted);
        } else {
          this.workspaceService.isBiometricsAuthenticationInProgress = false;
          UiUtil.unlockInterface();
          this.errorMessage = error;
          this.loginForm.get('password').setErrors({ error: true });
        }
      });
    };
  }

  get passwordControl(): FormControl {
    return this.loginForm.get('password') as FormControl;
  }

  get filePath(): string {
    const path = this.workspaceService.file?.filePath;

    if (path) {
      this._filePath = path;
    }

    return this._filePath ?? '';
  }

  get biometricsAuthenticationEnabled(): boolean {
    return this.config.biometricsAuthenticationEnabled && this.config.biometricsProtectedFiles.includes(this.filePath);
  }

  get isBiometricsAuthenticationInProgress(): boolean {
    return this.workspaceService.isBiometricsAuthenticationInProgress;
  }

  async ngOnInit() {
    this.configService.configLoadedSource$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(config => this.config = config);
    this.messageBroker.ipcRenderer.on(IpcChannel.DecryptedContent, this.onDecryptedContent);
    this.workspaceService.loadedDatabase$
      .pipe(
        switchMap(() => from(this.selectDefaultGroup())),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => {
        this.workspaceService.unlock();
      });

    this.oneOfTips = tips[Math.floor(Math.random() * tips.length)].content;
  }

  async selectDefaultGroup() {
    await this.groupManager.selectGroup(this.defaultGroup);
    await this.entryManager.setByGroup(this.defaultGroup);
    this.entryManager.updateEntriesSource();
  }

  // make sure window preview displays master password entry page
  ngAfterViewInit() {
    if (this.route.snapshot.queryParams.minimize === 'true') {
      setTimeout(() => {
        this.messageBroker.ipcRenderer.send(IpcChannel.Minimize);
      });
    }
  }

  ngOnDestroy() {
    this.loginForm.reset();
    this.messageBroker.ipcRenderer.off(IpcChannel.DecryptedContent, this.onDecryptedContent);
  }

  changeVisibility(isVisible: boolean, element: HTMLInputElement) {
    element.type = isVisible ? 'text' : 'password';
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  async createNew(): Promise<void> {
    await this.messageBroker.ipcRenderer.invoke(IpcChannel.CreateNew);
    this.workspaceService.createNew();
  }

  openSettingsWindow() {
    this.modalService.openSettingsWindow();
  }

  biometricsUnlock() {
    UiUtil.lockInterface();
    this.workspaceService.isBiometricsAuthenticationInProgress = true;
    this.messageBroker.ipcRenderer.send(IpcChannel.DecryptBiometrics);
  }

  async onLoginSubmit() {
    Object.values(this.loginForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.loginForm.invalid) {
      return;
    }

    UiUtil.lockInterface();
    this.messageBroker.ipcRenderer.send(IpcChannel.DecryptDatabase, this.loginForm.value.password);
  }
}
