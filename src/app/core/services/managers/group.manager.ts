import { Injectable } from "@angular/core";
import { initialEntries } from "@app/core/database";
import { GroupIds } from "@app/core/enums";
import { IPasswordGroup } from "@app/core/models";
import { GroupRepository } from "@app/core/repositories";
import { Observable, Subject, shareReplay } from "rxjs";

@Injectable({ providedIn: 'root' })
export class GroupManager {
  public groups: IPasswordGroup[] = [];
  public selectedGroup?: number;
  public selectedGroupName?: string;
  public contextSelectedGroup?: number;
  public isGroupDragged?: boolean;

  public markDirtySource: Subject<void>;
  public removedGroupSource: Subject<void> = new Subject();
  public addedGroupSource: Subject<any> = new Subject();

  public readonly renamedGroup$: Observable<boolean>;

  private readonly renamedGroupSource: Subject<boolean> = new Subject();

  get isAddPossible(): boolean {
    const selectedCategoryId = this.selectedGroup;

    return selectedCategoryId !== GroupIds.RecycleBin
      && selectedCategoryId !== GroupIds.Starred;
  }

  constructor(private readonly groupRepository: GroupRepository) {
    this.renamedGroup$ = this.renamedGroupSource.asObservable().pipe(shareReplay());
  }

  async removeGroup() {
    if (!this.selectedGroup) {
      this.throwCategoryNotSelectedError();
    }

    const groupsToDelete = [this.selectedGroup] as number[];
    await this.groupRepository.bulkDelete(groupsToDelete);

    this.removedGroupSource.next();
  }

  async updateGroup(group: IPasswordGroup) {
    await this.groupRepository.update({
      id: group.id,
      name: group.name,
    });

    this.markDirty();
  }

  async moveGroup(from: number, to: number) {
    const group = await this.groupRepository.get(from);
    await this.groupRepository.update({ ...group, parent: to });

    this.markDirty();
  }

  async addGroup(model?: Partial<IPasswordGroup>): Promise<number> {
    if (!this.selectedGroup) {
      this.throwCategoryNotSelectedError();
    }
  
    const newGroup: IPasswordGroup = {
      name: model?.name ?? 'New group',
      parent: this.selectedGroup,
    };

    if (model?.isImported) {
      newGroup.isImported = true;
    }

    const groupId = await this.groupRepository.add(newGroup);

    if (groupId > 0) {
      this.addedGroupSource.next({ id: groupId, name: newGroup.name, isImported: newGroup.isImported });

      if (!model?.name) {
        this.renameGroup(true);
      }
    }

    this.markDirty();

    return groupId;
  }

  async selectGroup(id: number) {
    this.selectedGroup = id;
    this.selectedGroupName = (await this.groupRepository.get(id)).name;
  }

  renameGroup(isRenamed: boolean) {
    this.renamedGroupSource.next(isRenamed);
  }

  async setupGroups() {
    await this.groupRepository.bulkAdd(initialEntries);

    this.groups = await this.getGroupsTree();
  }

  async getGroupsTree(): Promise<IPasswordGroup[]> {
    const allGroups = await this.groupRepository.getAll();
  
    this.groups[0] = allGroups.find(g => g.id === GroupIds.Root);
    this.groups[1] = allGroups.find(g => g.id === GroupIds.Starred);
    this.groups[2] = allGroups.find(g => g.id === GroupIds.RecycleBin);

    this.groups[0].expanded = true;
    this.buildGroupsTree(this.groups[0], allGroups);

    return this.groups;
  }

  private buildGroupsTree(group: IPasswordGroup, groups: IPasswordGroup[]) {
    const children = groups.filter(g => g.parent === group.id);

    if (!children.length) {
      return;
    }

    group.children = children;
    group.children.forEach(child => {
      this.buildGroupsTree(child, groups);
    });
  }

  private throwCategoryNotSelectedError(): never {
    throw new Error('No category has been selected.');
  }

  private markDirty() {
    this.markDirtySource.next();
  }
}