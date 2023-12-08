export type Toast = {
  message: string;
  type: 'success' | 'error';
  alive?: number;
  showCount?: boolean;
}
