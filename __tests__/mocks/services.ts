import { readdirSync } from 'fs';

export function mockServices() {
	readdirSync('main/services').forEach((file) => {
		file = file.replace('.ts', '');
		jest.mock(`@root/main/services/${file}`, () => jest.fn());
	});
}
