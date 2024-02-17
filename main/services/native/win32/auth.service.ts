import { MessageEventType } from './message-event-type.enum';

type EventPayload = {
	type: MessageEventType;
};

type GetPasswordEvent = EventPayload & {
	windowHandleHex: string;
	dbPath: string;
};

type SavePasswordEvent = EventPayload & {
	password: string;
	dbPath: string;
};

type RemovePasswordEvent = EventPayload & {
	dbPath: string;
};

type ListPathsEvent = EventPayload;

class Main {
	private readonly _messageListener: () => void;
	private readonly _credentialPrefix = 'fbit:';

	constructor() {
		this._messageListener = this.execute.bind(this);
	}

	public setup(): NodeJS.Process {
		return process.on('message', this._messageListener);
	}

	private execute(event: EventPayload): void {
		switch (event.type) {
			case MessageEventType.GetPassword:
				this.getPassword(event as GetPasswordEvent);
				break;
			case MessageEventType.SavePassword:
				this.savePassword(event as SavePasswordEvent);
				break;
			case MessageEventType.RemovePassword:
				this.removePassword(event as RemovePasswordEvent);
				break;
			case MessageEventType.ListPaths:
				this.listPaths(event as ListPathsEvent);
				break;

			default:
				break;
		}

		process.exit();
	}

	private getPassword(event: GetPasswordEvent): void {
		const { windowHandleHex, dbPath } = event;
		const nativeAuth = require('bindings')('NativeAuth');
		const verified: boolean = nativeAuth.verify(
			Buffer.from(windowHandleHex, 'hex'),
		);
		let password = '';

		if (verified) {
			password = nativeAuth.getCredential(this._credentialPrefix + dbPath);
		}

		process.send?.(password);
	}

	private savePassword(event: SavePasswordEvent): void {
		const { dbPath, password } = event;
		const nativeAuth = require('bindings')('NativeAuth');
		nativeAuth.saveCredential(this._credentialPrefix + dbPath, password);
	}

	private removePassword(event: RemovePasswordEvent): void {
		const { dbPath } = event;
		const nativeAuth = require('bindings')('NativeAuth');
		nativeAuth.removeCredential(this._credentialPrefix + dbPath);
	}

	private listPaths(event: ListPathsEvent): void {
		const nativeAuth = require('bindings')('NativeAuth');
		const paths = nativeAuth
			.listCredentials(this._credentialPrefix)
			.map((x) => x.replace(this._credentialPrefix, '').replace(/\\\\/g, '\\'));

		process.send?.(paths);
	}
}

new Main().setup();
