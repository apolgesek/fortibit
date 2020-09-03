import { Component, OnInit } from '@angular/core';
import { DatabaseService } from '@app/core/services/database.service';
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
    private databaseService: DatabaseService,
    private fb: FormBuilder,
    public ref: DynamicDialogRef
  ) { }

  ngOnInit(): void {
    this.initEntryForm();
  }

  initEntryForm() {
    this.newEntryForm = this.fb.group({
      id: [''],
      title: [''],
      username: ['', Validators.required],
      value: ['', Validators.required],
      url: [''],
      notes: [''],
      creationDate: [null],
      lastAccessDate: [null]
    }, { updateOn: 'blur' });

    if (this.databaseService.editedEntry) {
      this.newEntryForm.patchValue(this.databaseService.editedEntry);
    }
  }

  addNewEntry() {
    Object.values(this.newEntryForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.newEntryForm.valid) {
      if (this.databaseService.editedEntry?.id) {
        this.databaseService.addEntry(this.newEntryForm.value);
      } else {
        this.databaseService.addEntry({...this.newEntryForm.value, creationDate: new Date()});
      }
      this.ref.close();
    }
  }

}
