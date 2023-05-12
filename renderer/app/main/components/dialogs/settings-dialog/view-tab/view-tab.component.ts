import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ConfigService, WorkspaceService } from '@app/core/services';
import { Subject, take, takeUntil } from 'rxjs';
import { IProduct } from '../../../../../../../product';
import { FeatherModule } from 'angular-feather';

@Component({
  selector: 'app-view-tab',
  templateUrl: './view-tab.component.html',
  styleUrls: ['./view-tab.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FeatherModule
  ]
})
export class ViewTabComponent implements OnInit, OnDestroy {
  public viewForm: FormGroup;
  private readonly destroyed: Subject<void> = new Subject();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly workspaceService: WorkspaceService,
    private readonly configService: ConfigService,
  ) { }

  ngOnInit(): void {
    this.configService.configLoadedSource$.pipe(take(1)).subscribe((config) => {
      this.viewForm = this.formBuilder.group({
        darkTheme: [config.theme === 'dark'],
        displayIcons: [config.displayIcons]
      });

      this.viewForm.valueChanges
      .pipe(
        takeUntil(this.destroyed)
      ).subscribe((form) => {
        if (this.viewForm.valid) {
          const configPartial = {
            displayIcons: form.displayIcons,
            theme: form.darkTheme ? 'dark' : 'light'
          } as Partial<IProduct>;
  
          this.configService.setConfig(configPartial);
        }
      });

      this.viewForm.get('darkTheme').valueChanges
        .pipe(takeUntil(this.destroyed))
        .subscribe(() => {
          this.toggleTheme();
        });
    });
  }

  toggleTheme() {
    this.workspaceService.toggleTheme();
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }
}
