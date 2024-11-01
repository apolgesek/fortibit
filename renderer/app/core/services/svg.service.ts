import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SvgService {
  files: Map<string, string> = new Map<string, string>();

  async getFile(path: string) {
    path = 'assets/' + path;
    
    const svgResponse = await fetch(path);
    const inlineData = await svgResponse.text();

    this.files.set(path, inlineData);
  }
}
