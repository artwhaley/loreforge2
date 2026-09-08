import type { NavigationItem } from "./common";

export type AboutPageModel = {
  baseUrl: string;
  bodyHtml: string;
  editHref: string | null;
  destinations: NavigationItem[];
};

export type LorePageModel = {
  baseUrl: string;
  introduction: string;
  destinations: NavigationItem[];
  entries: LoreEntry[];
};

export type LoreEntry = {
  id: number;
  title: string;
  slug: string;
  group: string;
  summary: string;
  updatedLabel: string;
  bodyHtml: string;
};
