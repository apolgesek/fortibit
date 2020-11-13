import { Injectable } from "@angular/core";
import { TreeNode } from "primeng-lts/api";
import { BehaviorSubject, Observable } from "rxjs";
import { PasswordEntry } from "../models";

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchPhraseSource: BehaviorSubject<string> = new BehaviorSubject<string>('');
  public searchPhrase$: Observable<string>;

  constructor() {
    this.searchPhrase$ = this.searchPhraseSource.asObservable().pipe();
  }

  public search(value: string) {
    this.searchPhraseSource.next(value);
  }

  public reset() {
    this.searchPhraseSource.next('');
  }

  public filterEntries(passwords: PasswordEntry[], phrase: string, group: TreeNode): PasswordEntry[] {
    if (!phrase) {
      return passwords;
    }
    const tempData: PasswordEntry[] = [];
    this.createSearchResultList(group, tempData, phrase);
    return tempData;
  }

  private createSearchResultList(node: TreeNode, output: PasswordEntry[] & any, phrase: string) {
    if (node.data.length) {
      const filteredNodes: PasswordEntry[] = node.data
        .filter(p => (p.title.includes(phrase) || p.username.includes(phrase) || p.url?.includes(phrase)));
      if (filteredNodes.length) {
        const path: string[] = [];
        this.createPath(node, path);
        output.push({ name: path.reverse().join('/'), isGroup: true });
        output.push(...filteredNodes);
      }
    }
    if (node.children?.length) {
      node.children.forEach((element: TreeNode) => {
        this.createSearchResultList(element, output, phrase);
      });
    } else {
      return output;
    }
  }

  private createPath(node: TreeNode, path: string[]) {
    path.push(node.label);
    if (node.parent) {
      this.createPath(node.parent, path);
    }
  }

}