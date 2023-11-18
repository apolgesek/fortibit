import { Injectable, inject } from '@angular/core';
import { DbManager, initialEntries } from '@app/core/database';
import { GroupId } from '@app/core/enums';
import { GroupRepository } from '@app/core/repositories';
import { IEntryGroup } from '@shared-renderer/entry-group';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GroupManager {
  public readonly markDirtySource: Subject<void> = new Subject();
  public groups: IEntryGroup[] = [];
  public builtInGroups: IEntryGroup[] = [];
  public selectedGroup?: number;
  public selectedGroupName?: string;
  public contextSelectedGroup?: number;
  public isGroupDragged?: boolean;

  private readonly groupRepository: GroupRepository = new GroupRepository(inject(DbManager));

  get isAddAllowed(): boolean {
    const selectedCategoryId = this.selectedGroup;

    return selectedCategoryId !== GroupId.RecycleBin
      && selectedCategoryId !== GroupId.Starred;
  }

  async getAll(): Promise<IEntryGroup[]> {
    return this.groupRepository.getAll();
  }

  async get(id: number): Promise<IEntryGroup> {
    return this.groupRepository.get(id);
  }

  async removeGroup() {
    await this.groupRepository.bulkDelete([this.selectedGroup]);
    await this.getGroupsTree();
    await this.selectGroup(GroupId.AllItems);

    this.markDirty();
  }

  async updateGroup(group: IEntryGroup) {
    await this.groupRepository.update({
      id: group.id,
      name: group.name,
    });

    this.getGroupsTree();
    this.markDirty();
  }

  async bulkAdd(groups: IEntryGroup[]): Promise<number> {
    return this.groupRepository.bulkAdd(groups);
  }

  async addGroup(model?: Partial<IEntryGroup>): Promise<number> {
    const newGroup: IEntryGroup = {
      name: model?.name ?? 'New group',
    };

    if (model?.isImported) {
      newGroup.isImported = true;
    }

    const groupId = await this.groupRepository.add(newGroup);

    if (groupId > 0) {
      await this.getGroupsTree();
    }

    this.markDirty();

    return groupId;
  }

  async selectGroup(id: number) {
    this.selectedGroup = id;
    this.selectedGroupName = (await this.groupRepository.get(id)).name;
  }

  async setupGroups() {
    await this.groupRepository.bulkAdd(initialEntries);
    this.groups = await this.getGroupsTree();
    this.selectedGroup = GroupId.AllItems;
  }

  async getGroupsTree(): Promise<IEntryGroup[]> {
    const builtInGroups = [GroupId.Root, GroupId.AllItems, GroupId.Starred, GroupId.RecycleBin];
    const allGroups = await this.groupRepository.getAll();

    this.groups = [];
    this.groups[0] = allGroups.find(g => g.id === GroupId.Root);
    this.builtInGroups = builtInGroups.map(g => initialEntries.find(x => x.id === g));

    const rootGroups = allGroups
      .filter(x => !builtInGroups.includes(x.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (let index = 0; index < rootGroups.length; index++){
      this.groups[index + 1] = rootGroups[index];
    }

    return this.groups;
  }

  private markDirty() {
    this.markDirtySource.next();
  }
}
