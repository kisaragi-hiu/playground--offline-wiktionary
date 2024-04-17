import type { MergeDeep } from "type-fest";

interface Page {
  title: string;
  ns: number;
  id: number;
  redirect?: string;
  revision: {
    id: number;
    parentId: number;
    timestamp: string;
    contributor: { username: string; id: number };
    comment: string;
    model: string;
    format: string;
    text: { $text: string } | string;
    sha1: string;
  };
}

export type RawPage = MergeDeep<
  Page,
  {
    ns: string;
    id: string;
    revision: {
      id: string;
      parentId: string;
    };
  }
>;

export type Article = {
  name: string;
  identifier: number;
  // biome-ignore lint: existing API
  date_modified: string;
  version: { identifier: number };
  url: string;
  namespace: { identifier: number };
  // biome-ignore lint: existing API
  in_language: { identifier: string };
  // biome-ignore lint: existing API
  main_entity: {
    identifier: string;
    url: string;
  };
  // biome-ignore lint: existing API
  additional_entities: unknown[];
  categories?: Array<{
    name: string;
    url: string;
  }>;
  templates?: Array<{
    name: string;
    url: string;
  }>;
  // biome-ignore lint: existing API
  is_part_of: {
    identifier: string;
    url: string;
  };
  // biome-ignore lint: existing API
  article_body: {
    html: string;
    wikitext: string;
  };
  license: Array<{
    name: string;
    identifier: string;
    url: string;
  }>;
  event: {
    identifier: string;
    type: string;
    // biome-ignore lint: existing API
    date_created: string;
  };
};
