import * as fs from "node:fs";
import { default as flow } from "xml-flow";
import { Database } from "bun:sqlite";
import type { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const variant = process.argv[2] || "jawiktionary";

fs.rmSync("articles.sqlite", { force: true });
const db = new Database("articles.sqlite");
db.run(`CREATE TABLE pages (
  id INTEGER PRIMARY KEY,
  title TEXT,
  text TEXT,
  redirect TEXT,
  revisionId INTEGER,
  lastModified TEXT,
  lastContributor TEXT
)`);

const filename = `${variant}-latest-pages-articles.xml`;
const fileStream = fs.createReadStream(filename);
const xmlStream = flow(fileStream) as Readable;

console.log("Inserting ${filename} into database...");

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
type RawPage = Page & {
    ns: string;
    id: string;
    revision: {
        id: string;
        parentId: string;
    };
};

const insert = db.prepare(
    "INSERT INTO pages (id,title,text,redirect,revisionId,lastModified,lastContributor) VALUES ($id,$title,$text,$redirect,$revisionId,$lastModified,$lastContributor)",
);
console.log("Inserting...");
let i = 0;
db.run("BEGIN TRANSACTION;");
xmlStream.on("tag:page", (page: RawPage) => {
    i++;
    if (page.ns !== "0") return;

    const revision = page.revision;
    let text: string;
    if (typeof revision.text === "object") {
        text = revision.text["$text"];
    } else {
        text = revision.text;
    }

    const obj = {
        $id: parseInt(page.id),
        $title: page.title,
        $text: text,
        $redirect: page.redirect || null,
        $revisionId: parseInt(revision.id),
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
    if (i % 10000 === 0) console.log(`Inserted ${i} items`);
});

xmlStream.on("end", () => {
    console.log(`Inserted ${i} items`);
    console.log(`Committing transaction...`);
    db.run("COMMIT;");
    console.log(`Committing transaction...done`);
});
