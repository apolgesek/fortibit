export interface IPasswordGroup {
  id?: number;
  name?: string;
  parent?: number;
  expanded?: boolean;
  children?: IPasswordGroup[];
}