import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, OnInit, NgZone, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute  } from '@angular/router';
import { GroupId } from '@app/core/enums';
import { ICommunicationService } from '@app/core/models';
import { EntryManager, GroupManager, ModalService, WorkspaceService } from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
import { AutofocusDirective } from '@app/main/directives/autofocus.directive';
import { IpcChannel } from '@shared-renderer/index';
import { CommunicationService } from 'injection-tokens';
import { from, Subject } from 'rxjs';
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
    AutofocusDirective
  ]
})
export class MasterPasswordComponent implements OnInit, OnDestroy {
  public loginForm: FormGroup;
  public config: IAppConfig;
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

    this.onDecryptedContent = (_: any, { decrypted }: { decrypted: string }) => {
      this.zone.run(() => {
        if (decrypted) {
          this.workspaceService.setSynced();
          this.workspaceService.loadDatabase(decrypted);
        } else {
          this.loginForm.get('password').setErrors({ invalidPassword: true });
          this.animate('.brand .brand-logo', 'animate-invalid', 500);
        }
      });
    };
  }

  ngOnInit() {
    this.configService.configLoadedSource$.pipe(takeUntil(this.destroyed$)).subscribe(config => {
      this.config = config;
    });

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

  // make sure window preview displays password entry page
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

  async onLoginSubmit() {
    Object.values(this.loginForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.loginForm.invalid) {
      return;
    }

    this.communicationService.ipcRenderer.send(IpcChannel.DecryptDatabase, this.loginForm.value.password);
  }

  animate(selector: string, animationClass: string, duration = 500) {
    this.document.querySelector(selector)?.classList.add(animationClass);

    setTimeout(() => {
      this.document.querySelector(selector)?.classList.remove(animationClass);
    }, duration);
  }
}