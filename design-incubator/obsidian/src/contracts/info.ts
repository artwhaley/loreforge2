import type { NavigationItem } from "./common";

export type AboutPageModel = {
  baseUrl: string;
  bodyHtml: string;
  editHref: string | null;
  destinations: NavigationItem[];
};

export type LorePageModel = {
  baseUrl: string;
  destinations: NavigationItem[];
};
