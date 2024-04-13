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
