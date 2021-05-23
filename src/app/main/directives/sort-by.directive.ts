import { AfterViewInit, Directive, ElementRef, HostListener, Input, OnDestroy, Renderer2 } from '@angular/core';
import { Sort } from '@app/core/enums';
import { IPasswordEntry } from '@app/core/models';
import { SearchService } from '@app/core/services';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
@Directive({
  selector: '[appSortBy]'
})

export class SortByDirective implements AfterViewInit, OnDestroy {
  @Input('appSortBy') public sortBy: keyof IPasswordEntry = 'title';

  private readonly destroyed$: Subject<void> = new Subject();
  private readonly iconDesc = 'pi pi-caret-down'
  private readonly iconAsc = 'pi pi-caret-up';

  private state: Sort = Sort.Asc;
  private icon: HTMLElement= this.renderer.createElement('i'); 

  constructor(
    private searchService: SearchService,
    private renderer: Renderer2,
    private element: ElementRef) {
  }

  public get isActiveSortProp() {
    return this.sortBy === this.searchService.sortProp;
  }

  @HostListener('mouseenter')
  onMouseEnter() {
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

    this.renderer.appendChild(this.element.nativeElement, this.icon);

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
