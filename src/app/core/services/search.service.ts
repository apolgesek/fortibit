import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Sort } from '../enums';
import { IPasswordEntry } from '../models';
interface ISearchService {
  updateSearchResults(): void;
  reset() : void;
  setSort(state: Sort, prop: keyof IPasswordEntry) : void;
  filterEntries(passwords: IPasswordEntry[], phrase: string, searchResults: IPasswordEntry[]) : IPasswordEntry[];
}
@Injectable({
  providedIn: 'root'
})
export class SearchService implements ISearchService {
  public searchPhrase$: Observable<string>;
  public searchPhraseValue = '';

  public sortProp: keyof IPasswordEntry = 'creationDate';
  public sortOrder: Sort = Sort.Desc;

  public isGlobalSearchMode = false;

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

  public setSort(state: Sort, prop: keyof IPasswordEntry) {
    this.sortOrder = state;
    this.sortProp = prop;
    this.updateSearchResults();
  }

  public filterEntries(passwords: IPasswordEntry[], phrase: string, searchResults: IPasswordEntry[]): IPasswordEntry[] {
    if (!searchResults.length) {
      const filteredPasswords = passwords.filter(p => { 
        return p.title?.toLowerCase().includes(phrase.toLowerCase())
          || p.username.toLowerCase().includes(phrase.toLowerCase());
      });

      if (this.sortOrder === Sort.Asc) {
        filteredPasswords.sort((a, b) => this.compareAscending(a, b));
      } else if (this.sortOrder === Sort.Desc) {
        filteredPasswords.sort((a, b) => this.compareDescending(a, b));
      }

      return filteredPasswords;
    } else {
      if (this.sortOrder === Sort.Asc) {
        searchResults.sort((a, b) => this.compareAscending(a, b));
      } else if (this.sortOrder === Sort.Desc) {
        searchResults.sort((a, b) => this.compareDescending(a, b));
      }

      return searchResults;
    }
  }

  public compareAscending(a: IPasswordEntry, b: IPasswordEntry) {
    const firstProp = a[this.sortProp];
    const secondProp = b[this.sortProp];

    if (firstProp && secondProp) {
      return firstProp > secondProp ? -1 : 1;
    }

    return 0;
  }

  public compareDescending(a: IPasswordEntry, b: IPasswordEntry) {
    const firstProp = a[this.sortProp];
    const secondProp = b[this.sortProp];

    if (firstProp && secondProp) {
      return firstProp > secondProp ? 1 : -1;
    }

    return 0;
  }
}