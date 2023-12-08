import { CommonModule } from '@angular/common';
import { Component, QueryList, ViewChildren } from '@angular/core';
import { Sort } from '@app/core/enums';
import { SearchService } from '@app/core/services';
import { slideDown } from '@app/shared';
import { DropdownMenuDirective } from '@app/shared/directives/dropdown-menu.directive';
import { DropdownToggleDirective } from '@app/shared/directives/dropdown-toggle.directive';
import { DropdownDirective } from '@app/shared/directives/dropdown.directive';
import { MenuItemDirective } from '@app/shared/directives/menu-item.directive';
import { MenuDirective } from '@app/shared/directives/menu.directive';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { FeatherModule } from 'angular-feather';

type SortOption = {
  name: string;
  prop: 'username' | 'creationDate' | 'title';
}

type SortDirectionOption = {
  name: string;
  state: Sort;
}

@Component({
  selector: 'app-table-filters',
  standalone: true,
  imports: [
    CommonModule,
    FeatherModule,
    MenuDirective,
    DropdownDirective,
    DropdownToggleDirective,
    DropdownMenuDirective,
    MenuItemDirective,
    TooltipDirective
  ],
  templateUrl: './table-filters.component.html',
  styleUrls: ['./table-filters.component.scss'],
  animations: [
    slideDown
  ]
})
export class TableFiltersComponent {
  @ViewChildren('sort') public readonly sortDropdowns: QueryList<DropdownDirective>;
  @ViewChildren('filterDropdown') public readonly filterDropdowns: QueryList<DropdownDirective>;

  public readonly sortOptions: SortOption[] = [
    { name: 'Creation date', prop: 'creationDate' },
    { name: 'Title', prop: 'title' },
  ];

  public readonly sortDirectionOptions: SortDirectionOption[] = [
    { name: 'Ascending', state: Sort.Asc },
    { name: 'Descending', state: Sort.Desc }
  ];

  public readonly sort = Sort;
  public selectedSortOption: SortOption;
  public selectedSortDirection: SortDirectionOption;

  constructor(private readonly searchService: SearchService) {
    this.selectedSortOption = this.sortOptions.find(x => x.prop === this.searchService.sortProp);
    this.selectedSortDirection = this.sortDirectionOptions.find(x => x.state === this.searchService.sortOrder);
  }

  public get filtersCount(): number {
    return 0;
  }

  setSort(option: SortOption) {
    this.selectedSortOption = option;
    this.searchService.setSort(this.selectedSortDirection.state, option.prop);
  }

  setSortDirection(option: SortDirectionOption) {
    this.selectedSortDirection = option;
    this.searchService.setSort(option.state, this.selectedSortOption.prop);
  }

  onChildDropdownOpen(dropdown: DropdownDirective) {
    this.sortDropdowns.toArray().filter(x => x !== dropdown).forEach(x => {
      x.state.close();
    });
  }

  onDropdownOpen(dropdown: DropdownDirective) {
    this.filterDropdowns.toArray().filter(x => x !== dropdown).forEach(x => {
      x.state.close();
    });
  }
}
