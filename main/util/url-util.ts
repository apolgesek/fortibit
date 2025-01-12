import * as psl from 'psl';

export function getDomain(url: string): string {
	if (!/^https?:\/\//.test(url)) {
		url = 'https://' + url;
	}

	return psl.parse(new URL(url).hostname).domain;
}
