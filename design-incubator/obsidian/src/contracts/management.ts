export type ManagementRow = {
  id: number;
  primary: string;
  secondary: string;
  status?: string;
  updatedLabel?: string;
};

/** Generic management surface. Core supplies capability-filtered rows and actions. */
export type ManagementPageModel = {
  baseUrl: string;
  title: string;
  eyebrow: string;
  description: string;
  createLabel: string;
  searchPlaceholder: string;
  columns: string[];
  rows: ManagementRow[];
  emptyLabel: string;
};
