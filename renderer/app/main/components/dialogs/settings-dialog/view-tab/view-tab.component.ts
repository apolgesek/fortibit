import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ConfigService, WorkspaceService } from '@app/core/services';
import { IProduct } from '@config/product';
import { FeatherModule } from 'angular-feather';
import { take } from 'rxjs';

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
export class ViewTabComponent implements OnInit {
  public viewForm: FormGroup;

  constructor(
    private readonly destroyRef: DestroyRef,
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
          takeUntilDestroyed(this.destroyRef)
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
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.toggleTheme();
        });
    });
  }

  toggleTheme() {
    this.workspaceService.toggleTheme();
  }
}
