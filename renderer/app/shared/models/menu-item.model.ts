export type MenuItem = {
  label?: string;
  separator?: boolean;
  disabled?: boolean;
  command?: (event: Event) => void;
}
