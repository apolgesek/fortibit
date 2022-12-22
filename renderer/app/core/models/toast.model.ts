export interface IToastModel {
  message: string;
  type: 'success' | 'error';
  alive?: number;
  showCount?: boolean;
}