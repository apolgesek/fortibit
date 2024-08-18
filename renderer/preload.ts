import { contextBridge, ipcRenderer } from 'electron';

let channels: string[] = [];

const getLeakedPasswords = (args) => {
	const exportedVault = JSON.parse(args[1]);
	const mock = exportedVault.data.data.find(x => x.tableName === 'entries').rows
		.filter(x => x.type === 'password')
		.map(x => ({ id: x.id, occurrences: Math.floor(Math.random() * 100) + 1 }));

	return { data: JSON.stringify(mock) };
}

const handler = {
	get: function (target, prop) {
		if (prop === 'then') {
			return target.then.bind(target);
		}
	},
	apply: function (target, _, args) {
		// enforce correct namespacing and check whitelist
		if (!args[0].startsWith('app:') || !channels.includes(args[0])) {
			return;
		}

		if (process.env.TEST_MODE === '1') {
			switch (args[0]) {
				case 'app:scanLeaks':
					return getLeakedPasswords(args);
				case 'app:databaseChanged':
				case 'app:getUpdateState':
					return;
				default:
					break;
			}
		}

		return target(...args);
	},
};

contextBridge.exposeInMainWorld('api', {
	isTestMode: process.env.TEST_MODE === '1',
	loadChannels: async () => {
		if (channels.length > 0) {
			return;
		}

		const appChannels: string[] = await ipcRenderer.invoke(
			'app:getWhitelistedChannels',
		);

		channels = appChannels;
		Object.freeze(channels);

		return true;
	},
	send: new Proxy((channel, ...data) => {
		ipcRenderer.send(channel, ...data);
	}, handler),
	invoke: new Proxy((channel, ...data) => {
		return ipcRenderer.invoke(channel, ...data);
	}, handler),
	on: new Proxy((channel, data) => {
		ipcRenderer.on(channel, data);
	}, handler),
	off: new Proxy((channel, data) => {
		ipcRenderer.off(channel, data);
	}, handler),
});
