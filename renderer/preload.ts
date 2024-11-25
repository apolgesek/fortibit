import { contextBridge, ipcRenderer } from 'electron';

(function () {
	let validatedChannels: string[] = [];

	const getLeakedPasswords = (args) => {
		const exportedVault = JSON.parse(args[1]);
		const stub = exportedVault.data.data
			.find((x) => x.tableName === 'entries')
			.rows.filter((x) => x.type === 'password')
			.map((x) => ({
				id: x.id,
				occurrences: Math.floor(Math.random() * 100) + 1,
			}));

		return { data: JSON.stringify(stub) };
	};

	const getWeakPasswords = (args) => {
		const exportedVault = JSON.parse(args[1]);
		const stub = exportedVault.data.data
			.find((x) => x.tableName === 'entries')
			.rows.filter((x) => x.type === 'password')
			.map((x) => ({ id: x.id, score: Math.floor(Math.random() * 5) }));

		return { data: JSON.stringify(stub) };
	};

	const handler = {
		get: function (target, prop) {
			if (prop === 'then') {
				return target.then.bind(target);
			}
		},
		apply: function (target, _, args) {
			// enforce correct namespacing and check whitelist
			if (!args[0].startsWith('app:') || !validatedChannels.includes(args[0])) {
				return;
			}

			if (process.env.TEST_MODE === '1') {
				switch (args[0]) {
					case 'app:scanLeaks':
						return getLeakedPasswords(args);
					case 'app:getWeakPasswords':
						return getWeakPasswords(args);
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
			if (validatedChannels.length > 0) {
				return;
			}

			const channels: string[] = await ipcRenderer.invoke(
				'app:getWhitelistedChannels',
			);

			validatedChannels = channels;
			Object.freeze(validatedChannels);

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
})();
