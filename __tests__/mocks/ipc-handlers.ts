import { readdirSync } from 'fs';

export function mockIpcHandlers() {
	readdirSync('main/ipc').forEach((file) => {
		file = file.replace('.ts', '');
		jest.mock(`@root/main/ipc/${file}`, () => jest.fn());
	});
}
