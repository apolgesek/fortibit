export interface MenuItem {
  label?: string;
  separator?: boolean;
  disabled?: boolean;
  icon?: string;
  command?: (event: Event) => void;
}