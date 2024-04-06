import * as fs from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import { Database } from "bun:sqlite";

const db = new Database("articles.sqlite");
db.run(`CREATE TABLE pages (
  id INTEGER PRIMARY KEY,
  title TEXT,
  text TEXT,
  revisionId INTEGER,
  lastModified TEXT,
  lastContributor TEXT
)`);

const handler = await fs.readFile("jawiktionary-latest-pages-articles.xml");
let parser = new XMLParser();
const result = parser.parse(handler);
console.log("XML parsing done");

type Page = {
    title: string;
    ns: number;
    id: number;
    revision: {
        id: number;
        parentId: number;
        timestamp: string;
        contributor: { username: string; id: number };
        comment: string;
        model: string;
        format: string;
        text: string;
        sha1: string;
    };
};

const pages = result.mediawiki.page as Page[];

console.log("Inserting...");
const insert = db.prepare(
    "INSERT INTO pages (id,title,text,revisionId,lastModified,lastContributor) VALUES ($id,$title,$text,$revisionId,$lastModified,$lastContributor)",
);
db.transaction(() => {
    for (const page of pages) {
        if (page.ns !== 0) continue;
        const revision = page.revision;

        const obj = {
            $id: page.id,
            $title: page.title,
            $text: revision.text,
            $revisionId: revision.id,
            $lastModified: revision.timestamp,
            $lastContributor: revision.contributor.username,
        };

        try {
            insert.run(obj);
        } catch (e) {
            console.error(JSON.stringify(obj));
            console.error(JSON.stringify(e));
            throw e;
        }
    }
})();
