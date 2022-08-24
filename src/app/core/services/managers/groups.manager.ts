import { Injectable } from "@angular/core";
import { markDirty } from "@app/core/decorators/mark-dirty.decorator";
import { GroupIds } from "@app/core/enums";
import { IPasswordGroup } from "@app/core/models";
import { GroupRepository } from "@app/core/repositories";
import { TreeNode } from "@circlon/angular-tree-component";
import { Observable, Subject, shareReplay } from "rxjs";

@Injectable({ providedIn: 'root' })
export class GroupsManager {
  public groups: IPasswordGroup[] = [];
  public selectedCategory?: TreeNode;
  public contextSelectedCategory?: TreeNode;
  public readonly renamedGroup$: Observable<boolean>;

  private readonly renamedGroupSource: Subject<boolean> = new Subject();

  get isAddPossible(): boolean {
    const selectedCategoryId = this.selectedCategory?.data.id;

    return selectedCategoryId !== GroupIds.RecycleBin
      && selectedCategoryId !== GroupIds.Starred;
  }


  constructor(private readonly groupRepository: GroupRepository) {
    this.renamedGroup$ = this.renamedGroupSource.asObservable().pipe(shareReplay());
  }

  @markDirty({ updateEntries: false })
  async removeGroup() {
    if (!this.selectedCategory) {
      this.throwCategoryNotSelectedError();
    }

    const groupsToDelete = [this.selectedCategory.data.id] as number[];
    this.getGroupsRecursive(this.selectedCategory, groupsToDelete);

    await this.groupRepository.bulkDelete(groupsToDelete);
    const node = this.selectedCategory;
    node.parent.data.children.splice(node.parent.data.children.indexOf(node.data), 1);
    this.selectedCategory.treeModel.update();
    this.selectedCategory.treeModel.getNodeById(1).focus();
  }

  @markDirty({ updateEntries: false })
  async updateGroup(group: IPasswordGroup) {
    await this.groupRepository.update({
      id: group.id,
      name: group.name,
    });
  }

  @markDirty({ updateEntries: false })
  async moveGroup(from: TreeNode, to: TreeNode){
    this.groupRepository.update({ ...from.data, parent: to.parent.data.id });
  }

  @markDirty({ updateEntries: false })
  async addGroup(model?: Partial<IPasswordGroup>): Promise<number> {
    if (!this.selectedCategory) {
      this.throwCategoryNotSelectedError();
    }

    if (!this.selectedCategory.data.children) {
      this.selectedCategory.data.children = [];
    }
  
    const newGroup: IPasswordGroup = {
      name: model?.name ?? 'New group',
      parent: this.selectedCategory.data.id,
    };

    if (model?.isImported) {
      newGroup.isImported = true;
    }

    const groupId = await this.groupRepository.add(newGroup);

    if (groupId > 0) {
      const newGroupNode = {
        id: groupId,
        name: newGroup.name,
        isImported: newGroup.isImported
      };

      this.selectedCategory.data.children.push(newGroupNode);

      this.selectedCategory.treeModel.update();
      this.selectedCategory.treeModel.getNodeById(newGroupNode.id).ensureVisible();
      this.selectedCategory.treeModel.getNodeById(newGroupNode.id).focus();
      this.selectedCategory = this.selectedCategory.treeModel.getNodeById(newGroupNode.id);

      if (!model?.name) {
        this.renameGroup(true);
      }
    }

    return groupId;
  }

  renameGroup(isRenamed: boolean) {
    this.renamedGroupSource.next(isRenamed);
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

  private getGroupsRecursive(node: TreeNode, groups: number[]): number[] {
    if (!node.children?.length) {
      return [];
    }

    groups.push(...node.children.map(c => c.id));
    node.children.forEach((child) => {
      const a = this.getGroupsRecursive(child, groups);
      groups.push(...a);
    });

    return [];
  }
}