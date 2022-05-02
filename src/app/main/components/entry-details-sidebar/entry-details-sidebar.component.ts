import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { IPasswordGroup } from '@app/core/models';
import { NotificationService } from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';
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
  private readonly destroyed: Subject<void> = new Subject();

  get config(): IAppConfig {
    return this.configService.config as IAppConfig;
  }

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
    private readonly electronService: ElectronService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly renderer: Renderer2,
  ) {}

  ngOnInit(): void {
    this.storageService.selectEntry$.pipe(takeUntil(this.destroyed)).subscribe(entry => {
      this.group = this.findGroup(this.storageService.groups[0], entry.groupId);
    });
  }

  openUrl(url: string | undefined) {
    if (url) {
      this.electronService.ipcRenderer.send(IpcChannel.OpenUrl, url);
    }
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  openAutotypeInformation() {
    this.electronService.ipcRenderer.send(IpcChannel.OpenUrl, AppConfig.urls.repositoryUrl + AppConfig.urls.keyboardReference + AppConfig.urls.autotypeShortcut);
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

    private findGroup(group: IPasswordGroup, id: number): IPasswordGroup | undefined {
    if (group.id === id) {
      return group;
    }

    if (!group.children?.length) {
      return;
    }

    for (const child of group.children) {
      const group = this.findGroup(child, id);

      if (group) {
        return group;
      }
    }

    return;
  }
}
