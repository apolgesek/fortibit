import { DatabaseService } from './database.service';
import { PasswordEntry } from '../models/password-entry.model';

export class MockDataManager {
  constructor(
    private databaseService: DatabaseService
  ){ }

  loadMockEntries() {
    const mocks = require('../mocks/MOCK_DATA.json');
    const shuffledMocks = mocks.sort(() => 0.5 - Math.random());
    this.databaseService.groups[0].data = (shuffledMocks as PasswordEntry[]).splice(500, 20);
    this.databaseService.groups[0].children.forEach((_, index) => {
      this.databaseService.groups[0].children[index].data = (shuffledMocks as PasswordEntry[]).splice(index * 20, 20);
    });
    this.databaseService.setDateSaved();
  }
}
