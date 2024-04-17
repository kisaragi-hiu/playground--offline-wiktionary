// place files you want to import through the `$lib` alias in this folder.

import Database from "better-sqlite3";
import type { Article } from "./types";

const db = new Database(
  "/run/media/kisaragi-hiu/Data/jawiktionary-articles.sqlite",
);

const stmtExactArticle = db.prepare("select * from pages where title = ?");

export function getExactArticle(title: string) {
  return stmtExactArticle.get(title) as Article;
}
