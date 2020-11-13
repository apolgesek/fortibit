import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DynamicDialogRef } from 'primeng-lts/dynamicdialog';
import { fade } from '@app/shared/animations/fade-slide.animation';
import { fromEvent, Subject } from 'rxjs';
import { skipWhile, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-entry-dialog',
  templateUrl: './entry-dialog.component.html',
  styleUrls: ['./entry-dialog.component.scss'],
  animations: [fade()]
})
export class EntryDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  public newEntryForm: FormGroup;
  private readonly destroyed$: Subject<void> = new Subject();

  constructor(
    private fb: FormBuilder,
    private ref: DynamicDialogRef,
    private storageService: StorageService,
    private el: ElementRef
  ) { }

  get header(): string {
    return this.storageService.editedEntry ? 'Edit entry' : 'Add entry';
  }

  ngOnInit(): void {
    this.initEntryForm();
  }

  ngAfterViewInit(): void {
    Array.from(this.el.nativeElement.querySelectorAll('input')).forEach(el => {
      fromEvent(el as HTMLInputElement, 'keydown')
      .pipe(
        skipWhile((e: KeyboardEvent) => e.repeat === true),
        takeUntil(this.destroyed$)
      )
      .subscribe((e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          this.addNewEntry();
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  initEntryForm() {
    this.newEntryForm = this.fb.group({
      id: [''],
      title: [''],
      username: ['', Validators.required],
      password: ['', Validators.required],
      url: [''],
      notes: [''],
      creationDate: [null],
      lastAccessDate: [null]
    });

    if (this.storageService.editedEntry) {
      this.newEntryForm.patchValue(this.storageService.editedEntry);
    }
  }

  addNewEntry() {
    Object.values(this.newEntryForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.newEntryForm.valid) {
      if (this.storageService.editedEntry?.id) {
        this.storageService.addEntry(this.newEntryForm.value);
      } else {
        this.storageService.addEntry({...this.newEntryForm.value, creationDate: new Date()});
      }
      this.ref.close();
    }
  }

  close() {
    this.ref.close();
  }
}
