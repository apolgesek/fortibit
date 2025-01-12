import { Component, inject, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SvgService } from '../../../core/services';

@Component({
	selector: 'app-svg',
	standalone: true,
	imports: [],
	template: '<span [innerHTML]="svg"></span>',
})
export class SvgComponent implements OnInit {
	@Input() src: string;

	private readonly svgService = inject(SvgService);
	private readonly domSanitizer = inject(DomSanitizer);

	public svg: SafeHtml;

	ngOnInit(): void {
		const svg = this.svgService.files.get(this.src) as string;

		if (!svg) throw new Error(`No file found for path ${this.src}`);

		this.svg = this.domSanitizer.bypassSecurityTrustHtml(svg);
	}
}
