export const utf8ToHex = (str: string) =>
	Buffer.from(str, 'utf8').toString('hex');
export const hexToUtf8 = (hex: string) =>
	Buffer.from(hex, 'hex').toString('utf8');
