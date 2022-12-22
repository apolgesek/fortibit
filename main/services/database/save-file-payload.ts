export interface ISaveFilePayload {
  database: string;
  password: string;
  config: {
    forceNew: boolean;
    notify: boolean;
  };
}