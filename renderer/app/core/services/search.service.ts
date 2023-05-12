import { Injectable } from '@angular/core';
import { IPasswordEntry } from '@shared-renderer/index';
import { BehaviorSubject, debounceTime, distinctUntilChanged, map, Observable, Subject, tap } from 'rxjs';
import { Sort } from '../enums';

type SortableEntryProp = keyof Pick<IPasswordEntry, 'title' | 'username' | 'creationDate'>;

interface ISearchService {
  reset() : void;
  setSort(state: Sort, prop: SortableEntryProp) : void;
  filterEntries(passwords: IPasswordEntry[], phrase: string, searchResults: IPasswordEntry[]) : IPasswordEntry[];
}

@Injectable({
  providedIn: 'root'
})
export class SearchService implements ISearchService {
  public searchInputSource: Subject<string> = new Subject();
  public searchPhrase$: Observable<string>;
  public searchPhraseValue = '';
  public sortProp: SortableEntryProp = 'creationDate';
  public sortOrder: Sort = Sort.Desc;
  public isSearching = false;
  public wasSearched = false;

  set isGlobalSearchMode(value: boolean) {
    this._isGlobalSearchMode = value;
  }

  get isGlobalSearchMode(): boolean {
    return this._isGlobalSearchMode;
  }

  private searchPhraseSource: BehaviorSubject<string> = new BehaviorSubject<string>('');
  private _isGlobalSearchMode = false;

  constructor() {
    this.searchPhrase$ = this.searchPhraseSource.asObservable();
    this.setSort(Sort.Desc, 'creationDate');

    this.searchInputSource.pipe(
      map(x => x.trim()),
      tap((value) => {
        this.searchPhraseValue = value;
        this.isSearching = true;
      }),
      distinctUntilChanged(),
      debounceTime(500),
      tap((value) => {
        this.updateSearchResults();
        this.wasSearched = value.length > 0;
        this.isSearching = false;
      }),
    ).subscribe();
  }

  public reset() {
    this.searchPhraseValue = '';
    this.updateSearchResults();
  }

  public setSort(state: Sort, prop: SortableEntryProp) {
    this.sortOrder = state;
    this.sortProp = prop;
    this.updateSearchResults();
  }

  public filterEntries(passwords: IPasswordEntry[], phrase: string, searchResults: IPasswordEntry[]): IPasswordEntry[] {
    if (!searchResults.length) {
      let filteredPasswords = passwords.filter(p => { 
        if (phrase.length) {
          return p.title?.toLowerCase().includes(phrase.toLowerCase())
          || p.username?.toLowerCase().includes(phrase.toLowerCase());
        }

        return true;
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

  private compareAscending(a: IPasswordEntry, b: IPasswordEntry): number {
    if (a[this.sortProp] && b[this.sortProp]) {
      if (this.sortProp === 'creationDate') {
        const firstProp = a[this.sortProp];
        const secondProp = b[this.sortProp];
      
        return firstProp.getTime() - secondProp.getTime();
      } else if (this.sortProp === 'title' || this.sortProp === 'username') {
        const firstProp = a[this.sortProp];
        const secondProp = b[this.sortProp];
  
        return firstProp.localeCompare(secondProp);
      }
    } else if (a[this.sortProp] && !b[this.sortProp]) {
      return -1;
    } else {
      return 1;
    }
  }

  private compareDescending(a: IPasswordEntry, b: IPasswordEntry): number {
    if (a[this.sortProp] && b[this.sortProp]) {
      if (this.sortProp === 'creationDate') {
        const firstProp = a[this.sortProp];
        const secondProp = b[this.sortProp];
      
        return secondProp.getTime() - firstProp.getTime();
      } else if (this.sortProp === 'title' || this.sortProp === 'username') {
        const firstProp = a[this.sortProp];
        const secondProp = b[this.sortProp];

        return secondProp.localeCompare(firstProp);
      }
    } else if (!a[this.sortProp] && b[this.sortProp]) {
      return -1;
    } else {
      return 1;
    }
  }

  private updateSearchResults() {
    this.searchPhraseSource.next(this.searchPhraseValue);
  }
}