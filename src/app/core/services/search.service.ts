import { Injectable } from '@angular/core';
import { TreeNode } from 'primeng-lts/api';
import { BehaviorSubject, Observable } from 'rxjs';
import { IPasswordEntry } from '../models';

export interface ISearchResultGroup {
  groupPath: string;
}

export type SearchResult = ISearchResultGroup | IPasswordEntry;

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  public searchPhrase$: Observable<string>;
  public searchPhraseValue = '';

  private searchPhraseSource: BehaviorSubject<string> = new BehaviorSubject<string>('');

  constructor() {
    this.searchPhrase$ = this.searchPhraseSource.asObservable();
  }

  public updateSearchResults() {
    this.searchPhraseSource.next(this.searchPhraseValue);
  }

  public reset() {
    this.searchPhraseValue = '';
    this.updateSearchResults();
  }

  public filterEntries(passwords: IPasswordEntry[], phrase: string, group: TreeNode): SearchResult[] {
    if (!phrase.trim()) {
      return passwords;
    }
    const tempData: SearchResult[] = [];
    this.createSearchResultList(group, tempData, phrase);
    return tempData;
  }

  private createSearchResultList(node: TreeNode, output: SearchResult[], phrase: string) {
    const normalizedPhrase = phrase.trim().toLowerCase();

    if (node.data.length) {
      const filteredNodes: IPasswordEntry[] = (node.data as IPasswordEntry[])
        .filter(p => (p.title.toLowerCase().includes(normalizedPhrase)
          || p.username.toLowerCase().includes(normalizedPhrase))
        );

      if (filteredNodes.length) {
        const path: string[] = [];

        this.createPath(node, path);
        output.push({ groupPath: path.reverse().join('/') });

        filteredNodes.sort((a, b) => this.searchResultsComparer(a, b));
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

  /**
   * Sort in the following order: found in title, found in username. If found in title, sort by position in the string
   */
  private searchResultsComparer(a: IPasswordEntry, b: IPasswordEntry): number {
    if (!this.searchPhraseValue) {
      return 0;
    }

    const normalizedValue = this.searchPhraseValue.toLowerCase();

    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    const aUsername = a.username.toLowerCase();
    const bUsername = b.username.toLowerCase();

    const aTitlePhrase = aTitle.includes(normalizedValue);
    const bTitlePhrase = bTitle.includes(normalizedValue);
    const aUsernamePhrase = aUsername.includes(normalizedValue);
    const bUsernamePhrase = bUsername.includes(normalizedValue);

    if (aTitlePhrase && bTitlePhrase) {
      return aTitle.indexOf(normalizedValue) < bTitle.indexOf(normalizedValue) ? -1 : 1;
    } else if (aTitlePhrase && bUsernamePhrase) {
      return -1;
    } else if (aUsernamePhrase && bUsernamePhrase) {
      return aUsername.indexOf(normalizedValue) <= bUsername.indexOf(normalizedValue) ? -1 : 1;
    } else {
      return 0;
    }
  }
}