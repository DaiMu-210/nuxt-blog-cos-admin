export type LinkItem = {
  title: string;
  url: string;
  desc?: string;
  avatar?: string;
};

export type LinkGroup = {
  name: string;
  items: LinkItem[];
};

export type LinksData = {
  groups: LinkGroup[];
};

