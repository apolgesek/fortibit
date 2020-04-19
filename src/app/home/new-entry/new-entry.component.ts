import { Component, OnInit, NgZone } from '@angular/core';
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
    private electronService: ElectronService,
    private zone: NgZone,
  ) { }

  ngOnInit(): void {
    this.newEntryForm = this._fb.group({
      id: [''],
      title: ['', Validators.required],
      username: ['', Validators.required],
      value: ['', Validators.required],
      url: [''],
      notes: ['']
    });

    this.electronService.ipcRenderer.on('entryDataSent', (_, data) => {
      this.zone.run(() => {
        this.newEntryForm.patchValue(data);
      });
    })
  }

  addNewEntry() {
    if (this.newEntryForm.valid) {
      this.electronService.ipcRenderer.send('newEntry', this.newEntryForm.value);
    }
  }

}
