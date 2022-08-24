import { Injectable } from '@angular/core';
import { IPasswordEntry } from '@shared-renderer/index';
import { BehaviorSubject, debounceTime, distinctUntilChanged, Observable, Subject, tap } from 'rxjs';
import { Sort } from '../enums';

interface ISearchService {
  reset() : void;
  setSort(state: Sort, prop: keyof IPasswordEntry) : void;
  filterEntries(passwords: IPasswordEntry[], phrase: string, searchResults: IPasswordEntry[]) : IPasswordEntry[];
}

@Injectable({
  providedIn: 'root'
})
export class SearchService implements ISearchService {
  public searchInputSource: Subject<string> = new Subject();
  public searchPhrase$: Observable<string>;
  public searchPhraseValue = '';
  public sortProp: 'title' | 'username';
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

    this.searchInputSource.pipe(
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

  public setSort(state: Sort, prop: 'title' | 'username') {
    this.sortOrder = state;
    this.sortProp = prop;
    this.updateSearchResults();
  }

  public filterEntries(passwords: IPasswordEntry[], phrase: string, searchResults: IPasswordEntry[]): IPasswordEntry[] {
    if (!searchResults.length) {
      const filteredPasswords = passwords.filter(p => { 
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

  public compareAscending(a: IPasswordEntry, b: IPasswordEntry) {
    const firstProp = a[this.sortProp];
    const secondProp = b[this.sortProp];

    if (firstProp && secondProp) {
      return firstProp.localeCompare(secondProp);
    } else if (firstProp && !secondProp) {
      return -1;
    }  else {
      return 1;
    }
  }

  public compareDescending(a: IPasswordEntry, b: IPasswordEntry) {
    const firstProp = a[this.sortProp];
    const secondProp = b[this.sortProp];

    if (firstProp && secondProp) {
      return secondProp.localeCompare(firstProp);
    } else if (!firstProp && secondProp) {
      return -1;
    }  else {
      return 1;
    }
  }

  private updateSearchResults() {
    this.searchPhraseSource.next(this.searchPhraseValue);
  }
}