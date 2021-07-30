export interface IRepository<T> {
  getAll(): Promise<T[]>;
  get(id: number): Promise<T | undefined>;
  add(item: T) : Promise<number>;
  update(item: T) : Promise<number>;
  delete(id: number) : Promise<void>;
}