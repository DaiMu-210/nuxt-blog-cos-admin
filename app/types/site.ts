export type SocialItem = { label: string; url: string };

export type ProjectItem = { name: string; url: string; desc?: string; icon?: string };

export type SiteData = {
  title: string;
  since?: string;
  avatar?: string;
  name?: string;
  bio?: string;
  intro?: string;
  social?: SocialItem[];
  projects?: ProjectItem[];
  comments?: {
    beaudarRepo?: string;
    beaudarTheme?: string;
    beaudarOrigin?: string;
    beaudarBranch?: string;
  };
  home?: {
    pinnedSlugs?: string[];
    featuredSlugs?: string[];
    latestCount?: number;
    showStats?: boolean;
  };
};

