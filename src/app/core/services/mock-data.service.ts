import { Injectable } from '@angular/core';
import { TreeNode } from 'primeng-lts/api';
import { IPasswordEntry } from '../models/password-entry.model';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  public static loadMockedEntries(group: TreeNode) {
    const mocks = require('@assets/data/mock_data.json');
    const shuffledMocks = mocks.sort(() => 0.5 - Math.random());
    group.data = (shuffledMocks as IPasswordEntry[]).splice(500, 20);
    group.children.forEach((_, index) => {
      group.children[index].data = (shuffledMocks as IPasswordEntry[]).splice(index * 20, 20);
    });
  }
}
