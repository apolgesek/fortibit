import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { GroupId } from '@app/core/enums';
import { ICommunicationService, IPasswordGroup } from '@app/core/models';
import { ClipboardService, EntryManager, GroupManager, ModalService, NotificationService, WorkspaceService } from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
import { TooltipComponent } from '@app/shared/components/tooltip/tooltip.component';
import { SidebarHandleDirective } from '@app/shared/directives/sidebar-handle.directive';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { LinkPipe } from '@app/shared/pipes/link.pipe';
import { TimeRemainingPipe } from '@app/shared/pipes/time-remaining.pipe';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { AppConfig } from 'environments/environment';
import { CommunicationService } from 'injection-tokens';
import { Subject, takeUntil } from 'rxjs';
import { IAppConfig } from '../../../../../app-config';

@Component({
  selector: 'app-entry-details-sidebar',
  templateUrl: './entry-details-sidebar.component.html',
  styleUrls: ['./entry-details-sidebar.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FeatherModule,
    SidebarHandleDirective,
    TooltipDirective,
    TooltipComponent,
    LinkPipe,
    TimeRemainingPipe,
  ],
  animations: [
    trigger('star', [
      transition('false => true', animate(250, keyframes([
        style({ scale: 1, offset: 0 }),
        style({ scale: 1.5, offset: 0.25 }),
        style({ scale: 0.9, offset: 0.5 }),
        style({ scale: 1.2, offset: 0.75 }),
        style({ scale: 1, offset: 1 })
      ])))
    ])
  ]
})
export class EntryDetailsSidebarComponent implements OnInit, OnDestroy {
  @ViewChild('toggleStarBtn') public readonly toggleStarBtn: ElementRef;
  public group: IPasswordGroup;
  public config: IAppConfig;
  public shouldDisplayToolbar = true;
  public isFavoriteAnimationInProgress = false;
  private readonly destroyed: Subject<void> = new Subject();

  get entry(): IPasswordEntry {
    if (this.isEntrySelected) {
      return this.entryManager.selectedPasswords[0];
    }
  }

  get isUnsecured(): boolean {
    return !this.entry?.url?.startsWith('https://');
  }

  get isEntrySelected(): boolean {
    return this.entryManager.selectedPasswords.length === 1;
  }

  get databaseInformation(): { name: string } {
    return {
      name: this.workspaceService.databaseFileName
    };
  }

  get selectedGroup(): number {
    return this.groupManager.selectedGroup;
  }

  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly workspaceService: WorkspaceService,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager,
    private readonly modalService: ModalService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly clipboardService: ClipboardService
  ) {}

  ngOnInit(): void {
    this.configService.configLoadedSource$.pipe(takeUntil(this.destroyed)).subscribe(config => {
      this.config = config;
    });

    this.entryManager.selectEntry$.pipe(takeUntil(this.destroyed)).subscribe(entry => {
      this.group = this.findGroup([...this.groupManager.groups, ...this.groupManager.builtInGroups], entry.groupId);
      this.shouldDisplayToolbar = this.group.id !== GroupId.RecycleBin;
    });
  }

  openUrl(url: string): false {
    this.communicationService.ipcRenderer.send(IpcChannel.OpenUrl, url);
    return false;
  }

  openEntryHistory() {
    this.modalService.openEntryHistoryWindow(this.entry.id);
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  openAutotypeInformation() {
    this.communicationService.ipcRenderer.send(IpcChannel.OpenUrl, AppConfig.urls.repositoryUrl + AppConfig.urls.keyboardReference + AppConfig.urls.autotypeShortcut);
  }

  copyToClipboard(entry: IPasswordEntry, property: keyof IPasswordEntry) {
    this.clipboardService.copyToClipboard(entry, property);
  }

  async toggleStarred(entry: IPasswordEntry) {
    await this.entryManager.saveEntry({ ...entry, isStarred: !entry.isStarred});

    if (!entry.isStarred) {
      this.isFavoriteAnimationInProgress = true;
      this.notificationService.add({ message: 'Added to favourites', type: 'success', alive: 5000 });
    } else {
      this.notificationService.add({ message: 'Removed from favourites', type: 'success', alive: 5000 });
    }
  }

  private findGroup(groups: IPasswordGroup[], id: number): IPasswordGroup | undefined {
    for (const group of groups) {
      if (group.id === id) {
        return group;
      }
  
      if (!group.children?.length) {
        continue;
      }
  
      const found = this.findGroup(group.children, id);
      
      if (found) {
        return found;
      }
    }

    return;
  }
}
