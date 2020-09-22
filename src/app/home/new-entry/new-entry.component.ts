import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ElectronService } from '../../core/services';

@Component({
  selector: 'app-new-entry',
  templateUrl: './new-entry.component.html',
  styleUrls: ['./new-entry.component.scss']
})
export class NewEntryComponent implements OnInit {

  public newEntryForm: FormGroup;

  constructor(
    private _fb: FormBuilder,
    private electronService: ElectronService
  ) { }

  ngOnInit(): void {
    this.newEntryForm = this._fb.group({
      username: ['', Validators.required],
      value: ['', Validators.required],
      url: ['']
    });
  }

  addNewEntry() {
    if (this.newEntryForm.valid) {
      this.electronService.ipcRenderer.send('newEntry', this.newEntryForm.value);
    }
  }

}
