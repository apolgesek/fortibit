import { Component, OnInit } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { fade } from '@app/shared/animations/fade-slide.animation';

@Component({
  selector: 'app-entry-dialog',
  templateUrl: './entry-dialog.component.html',
  styleUrls: ['./entry-dialog.component.scss'],
  animations: [fade()]
})
export class EntryDialogComponent implements OnInit {
  public newEntryForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private ref: DynamicDialogRef,
    private storageService: StorageService
  ) { }

  get header(): string {
    return this.storageService.editedEntry ? 'Edit entry' : 'Add entry';
  }

  ngOnInit(): void {
    this.initEntryForm();
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
