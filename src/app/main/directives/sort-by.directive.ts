import { AfterViewInit, Directive, ElementRef, HostListener, Input, OnDestroy, Renderer2 } from '@angular/core';
import { Sort } from '@app/core/enums';
import { SearchService } from '@app/core/services/search.service';
import { IPasswordEntry } from '@shared-renderer/index';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
@Directive({
  selector: '[appSortBy]'
})

export class SortByDirective implements AfterViewInit, OnDestroy {
  @Input('appSortBy') public sortBy: keyof IPasswordEntry = 'title';

  private readonly destroyed$: Subject<void> = new Subject();
  private readonly iconDesc = 'pi pi-sort-alpha-down-alt';
  private readonly iconAsc = 'pi pi-sort-alpha-up-alt';

  private state: Sort = Sort.Asc;
  private icon: HTMLElement;

  constructor(
    private readonly searchService: SearchService,
    private readonly renderer: Renderer2,
    private readonly element: ElementRef) {
    
    this.icon = this.renderer.createElement('i');
  }

  public get isActiveSortProp() {
    return this.sortBy === this.searchService.sortProp;
  }

  @HostListener('mouseenter')
  onMouseEnter() {
    this.renderer.appendChild(this.element.nativeElement, this.icon);

    if (this.isActiveSortProp) {
      return;
    }

    this.icon.className = this.iconDesc;
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    if (this.isActiveSortProp) {
      return;
    }

    this.icon.className = '';
  
    this.renderer.removeChild(this.element.nativeElement, this.icon);
  }

  @HostListener('click')
  onClick() {
    if (!this.isActiveSortProp) {
      this.setDescending();
    } else {
      switch (this.state) {
      case Sort.Asc:
        this.setDescending();
        break;
      
      default:
        this.setAscending();
        break;
      }
    }

    this.searchService.setSort(this.state, this.sortBy);
  }

  ngAfterViewInit() {
    if (this.sortBy === this.searchService.sortProp) {
      this.setDescending();
    }

    this.searchService.searchPhrase$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        if (this.searchService.sortProp !== this.sortBy) {
          this.icon.className = '';
        }
      });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  setDescending() {
    this.state = Sort.Desc;
    this.icon.className = this.iconDesc;
  }

  setAscending() {
    this.state = Sort.Asc;
    this.icon.className = this.iconAsc;
  }
}
