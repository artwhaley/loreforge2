import type { NavigationItem } from "./common";

/**
 * Authorized Domain shell model. A Design receives already-filtered
 * navigation — it never decides who may see People/Roles/Folders/etc.
 */
export type DomainShellModel = {
  domain: {
    id: number;
    slug: string;
    name: string;
    motto: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    backgroundUrl: string | null;
  };

  primaryNavigation: NavigationItem[];
  managementNavigation: NavigationItem[];

  operatingContext: {
    platformLabel: string;
    availableDomains: DomainSwitcherOption[];
    activeDomainId: number;
    availableCharacters: CharacterSwitcherOption[];
    activeCharacterId: number | null;
    account: AccountSummary | null;
  };

  routes: {
    baseUrl: string;
    workUrl: string;
  };
};

export type DomainSwitcherOption = {
  id: number;
  slug: string;
  name: string;
};

export type CharacterSwitcherOption = {
  id: number;
  name: string;
};

export type AccountSummary = {
  name: string;
  email: string;
};
