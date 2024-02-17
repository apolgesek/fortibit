import { Directive, Input, ElementRef } from '@angular/core';
@Directive({
	selector: '[appTextEmphasize]',
	standalone: true,
})
export class TextEmphasizeDirective {
	private readonly openingTag = '<span class="emp">';
	private readonly closingTag = '</span>';
	private searchPhraseValue = '';

	constructor(private readonly element: ElementRef) {}

	@Input('appTextEmphasize') set searchPhrase(value: string | null) {
		this.searchPhraseValue = value ? value.trim() : '';
		this.applyChanges();
	}

	private applyChanges() {
		setTimeout(() => {
			const elementTextContent = this.element.nativeElement as HTMLElement;

			elementTextContent.innerHTML = elementTextContent.innerHTML
				.replaceAll(new RegExp(this.openingTag, 'g'), '')
				.replaceAll(new RegExp(this.closingTag, 'g'), '');

			if (this.isSubstringNotFound(elementTextContent)) {
				return;
			}

			const matchedSubstrings = Array.from(
				(elementTextContent.textContent ?? '').matchAll(
					new RegExp(this.searchPhraseValue, 'gi'),
				),
			).map((x) => x[0]);

			for (const match of matchedSubstrings) {
				const lastFoundIndex = elementTextContent.innerHTML.lastIndexOf(
					this.closingTag,
				);
				let textToReplace = elementTextContent.innerHTML;

				if (lastFoundIndex >= 0) {
					textToReplace = elementTextContent.innerHTML.substring(
						lastFoundIndex + this.closingTag.length,
					);
				}

				elementTextContent.innerHTML =
					elementTextContent.innerHTML.substring(
						0,
						lastFoundIndex >= 0 ? lastFoundIndex + this.closingTag.length : 0,
					) +
					textToReplace.replace(
						match,
						this.openingTag + match + this.closingTag,
					);
			}
		});
	}

	private isSubstringNotFound(elementTextContent: HTMLElement) {
		return (
			this.searchPhraseValue.trim().length === 0 ||
			!elementTextContent.textContent
				?.toLowerCase()
				.includes(this.searchPhraseValue.toLowerCase())
		);
	}
}
