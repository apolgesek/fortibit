export function getHashCode(string: string): string {
	let hash = 0,
		i,
		chr;
	if (string.length === 0) return '0';
	for (i = 0; i < string.length; i++) {
		chr = string.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0; // Convert to 32bit integer
	}

	return (hash & 0x7fffffff).toString(16);
}
