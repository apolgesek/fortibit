import { Injectable } from "@angular/core";
import { EntriesManager } from "./entries.manager";
import { GroupsManager } from "./groups.manager";

@Injectable({ providedIn: 'root' })
export class AppManager {
  constructor(
    private readonly entriesManager: EntriesManager,
    private readonly groupsManager: GroupsManager
  ) {
    // single point service
  }

}