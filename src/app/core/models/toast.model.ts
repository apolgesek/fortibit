export interface IToastModel {
  message: string;
  type: 'success' | 'error';
  alive?: number;
}