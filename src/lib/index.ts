// place files you want to import through the `$lib` alias in this folder.

import Database from "better-sqlite3";
import type { Article } from "./types";

const db = new Database(
  "/run/media/kisaragi-hiu/Data/jawiktionary-articles.sqlite",
);

const stmtExactArticle = db.prepare("select * from pages where title = ?");

export function getExactArticle(title: string) {
  console.log(`Getting article for ${title}...`);
  const value = stmtExactArticle.get(title) as Article | undefined;
  console.log(`Getting article for ${title}...done`);
  return value;
}
