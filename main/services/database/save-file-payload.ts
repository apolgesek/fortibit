export type SaveFilePayload = {
	database: string;
	password: string;
	config: {
		forceNew: boolean;
		notify: boolean;
	};
};
