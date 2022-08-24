import { Component, ElementRef, Inject, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { CommunicationService } from '@app/app.module';
import { GroupIds } from '@app/core/enums';
import { ICommunicationService, IPasswordGroup } from '@app/core/models';
import { ModalService, NotificationService } from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
import { StorageService } from '@app/core/services/managers/storage.service';
import { TreeNode } from '@circlon/angular-tree-component';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
import { AppConfig } from 'environments/environment';
import { Subject, takeUntil } from 'rxjs';
import { IAppConfig } from '../../../../../app-config';

@Component({
  selector: 'app-entry-details-sidebar',
  templateUrl: './entry-details-sidebar.component.html',
  styleUrls: ['./entry-details-sidebar.component.scss'],
})
export class EntryDetailsSidebarComponent implements OnInit, OnDestroy {
  @ViewChild('toggleStarBtn') public readonly toggleStarBtn: ElementRef;
  public group: IPasswordGroup;
  public config: IAppConfig;
  public shouldDisplayToolbar = true;
  private readonly destroyed: Subject<void> = new Subject();

  get entry(): IPasswordEntry {
    if (this.isEntrySelected) {
      return this.storageService.selectedPasswords[0];
    }
  }

  get isEntrySelected(): boolean {
    return this.storageService.selectedPasswords.length === 1;
  }

  get databaseInformation(): { name: string } {
    return {
      name: this.storageService.databaseFileName
    };
  }

  get selectedGroup(): TreeNode {
    return this.storageService.selectedCategory;
  }

  constructor(
    private readonly storageService: StorageService,
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

    this.storageService.selectEntry$.pipe(takeUntil(this.destroyed)).subscribe(entry => {
      this.group = this.findGroup(this.storageService.groups, entry.groupId);
      this.shouldDisplayToolbar = this.group.id !== GroupIds.RecycleBin;
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

  toggleStarred(entry: IPasswordEntry) {
    const starredClass = 'starred';

    this.storageService.addOrUpdateEntry({ ...entry, isStarred: !entry.isStarred});

    if (!entry.isStarred) {
      this.notificationService.add({ message: 'Added to starred entries', type: 'success', alive: 5000 });
      this.renderer.addClass(this.toggleStarBtn.nativeElement, starredClass);
    } else {
      this.renderer.removeClass(this.toggleStarBtn.nativeElement, starredClass);
      this.notificationService.add({ message: 'Removed from starred entries', type: 'success', alive: 5000 });
    }
  }

  revealInGroup() {
    this.storageService.revealInGroup(this.entry);
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
