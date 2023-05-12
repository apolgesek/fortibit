import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GroupId } from '@app/core/enums';
import { ICommunicationService } from '@app/core/models';
import { EntryManager, GroupManager, ModalService, WorkspaceService } from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
import { AutofocusDirective } from '@app/shared/directives/autofocus.directive';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { UiUtil } from '@app/utils';
import { IpcChannel } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { CommunicationService } from 'injection-tokens';
import { Subject, from } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { IAppConfig } from '../../../../../app-config';

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
    TooltipDirective
  ]
})
export class MasterPasswordComponent implements OnInit, OnDestroy {
  public loginForm: FormGroup;
  public config: IAppConfig;
  public errorMessage: string;
  public passwordVisible = false;

  private readonly destroyed$: Subject<void> = new Subject();
  private readonly defaultGroup = GroupId.AllItems;

  private onDecryptedContent: (_: any, { decrypted }: { decrypted: string }) => void;
  private _filePath: string;

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

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly groupManager: GroupManager,
    private readonly entryManager: EntryManager,
    private readonly fb: FormBuilder,
    private readonly zone: NgZone,
    private readonly route: ActivatedRoute,
    private readonly configService: ConfigService,
    private readonly modalService: ModalService,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    @Inject(DOCUMENT) private readonly document: Document
  ) { 
    this.loginForm = this.fb.group({
      password: ['', Validators.required]
    });

    this.onDecryptedContent = (_, { decrypted, error }: { decrypted: string, error: string }) => {
      this.zone.run(async () => {
        if (decrypted && !error) {
          this.workspaceService.setSynced();
          await this.workspaceService.loadDatabase(decrypted);
        } else {
          this.workspaceService.isBiometricsAuthenticationInProgress = false;
          UiUtil.unlockInterface();
          this.errorMessage = error;
          this.loginForm.get('password').setErrors({ error: true });
          this.animate('.brand .brand-logo', 'animate-invalid', 500);
        }
      });
    };
  }

  ngOnInit() {
    this.configService.configLoadedSource$.pipe(takeUntil(this.destroyed$)).subscribe(config => this.config = config);
    this.communicationService.ipcRenderer.on(IpcChannel.DecryptedContent, this.onDecryptedContent);
    this.workspaceService.loadedDatabase$
    .pipe(
      switchMap(() => from(this.selectDefaultGroup())),
      takeUntil(this.destroyed$)
    ).subscribe(() => {
      this.workspaceService.unlock();
    });
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
        this.communicationService.ipcRenderer.send(IpcChannel.Minimize);
      });
    }
  }

  ngOnDestroy() {
    this.loginForm.reset();
    this.destroyed$.next();
    this.destroyed$.complete();
    this.communicationService.ipcRenderer.off(IpcChannel.DecryptedContent, this.onDecryptedContent);
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  createNew() {
    this.communicationService.ipcRenderer.invoke(IpcChannel.CreateNew).then(() => {
      this.workspaceService.createNew();
    });
  }

  openSettingsWindow() {
    this.modalService.openSettingsWindow();
  }

  biometricsUnlock() {
    UiUtil.lockInterface();
    this.workspaceService.isBiometricsAuthenticationInProgress = true;
    this.communicationService.ipcRenderer.send(IpcChannel.DecryptBiometrics);
  }

  async onLoginSubmit() {
    Object.values(this.loginForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.loginForm.invalid) {
      return;
    }

    UiUtil.lockInterface();
    this.communicationService.ipcRenderer.send(IpcChannel.DecryptDatabase, this.loginForm.value.password);
  }

  animate(selector: string, animationClass: string, duration = 500) {
    this.document.querySelector(selector)?.classList.add(animationClass);

    setTimeout(() => {
      this.document.querySelector(selector)?.classList.remove(animationClass);
    }, duration);
  }
}