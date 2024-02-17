export interface IMessageBroker {
	platform: string;
	ipcRenderer: {
		[name: string]: any;
		send: (...args) => void;
		on: (...args) => void;
		invoke: (...args) => Promise<any>;
		once: (...args) => Promise<any>;
		off: (...args) => any;
	};

	getPlatform(): Promise<string>;
}
