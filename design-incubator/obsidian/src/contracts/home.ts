import type { HomeRecordSummary, NavigationItem } from "./common";

/**
 * Semantic home page model. Describes the Home *surface*, not any Design's
 * arrangement. Designs decide whether welcome/destinations/recent-records are
 * a hero, cards, columns, carousel, etc.
 */
export type HomePageModel = {
  baseUrl: string;

  domain: {
    name: string;
    motto: string;
  };

  welcome: {
    html: string;
    editHref: string | null;
  };

  destinations: NavigationItem[];
  recentRecords: HomeRecordSummary[];
};
