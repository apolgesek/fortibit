import { CommonModule } from '@angular/common';
import { Component, ElementRef, Inject, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { GroupId } from '@app/core/enums';
import { ICommunicationService, IPasswordGroup } from '@app/core/models';
import { WorkspaceService, EntryManager, GroupManager, ModalService, NotificationService } from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
import { SidebarHandleDirective } from '@app/shared/directives/sidebar-handle.directive';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
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
    SidebarHandleDirective
  ]
})
export class EntryDetailsSidebarComponent implements OnInit, OnDestroy {
  @ViewChild('toggleStarBtn') public readonly toggleStarBtn: ElementRef;
  public group: IPasswordGroup;
  public config: IAppConfig;
  public shouldDisplayToolbar = true;
  private readonly destroyed: Subject<void> = new Subject();

  get entry(): IPasswordEntry {
    if (this.isEntrySelected) {
      return this.entryManager.selectedPasswords[0];
    }
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
    private readonly workspaceService: WorkspaceService,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager,
    private readonly modalService: ModalService,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly renderer: Renderer2,
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

  openUrl(url: string | undefined) {
    if (url) {
      this.communicationService.ipcRenderer.send(IpcChannel.OpenUrl, url);
    }
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

  async toggleStarred(entry: IPasswordEntry) {
    const starredClass = 'starred';

    await this.entryManager.addOrUpdateEntry({ ...entry, isStarred: !entry.isStarred});

    if (!entry.isStarred) {
      this.notificationService.add({ message: 'Added to favourites', type: 'success', alive: 5000 });
      this.renderer.addClass(this.toggleStarBtn.nativeElement, starredClass);
    } else {
      this.renderer.removeClass(this.toggleStarBtn.nativeElement, starredClass);
      this.notificationService.add({ message: 'Removed from favourites', type: 'success', alive: 5000 });
    }
  }

  revealInGroup() {
    this.entryManager.revealInGroup(this.entry);
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
