import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import readline from "node:readline";
import type { Readable } from "node:stream";
import { default as flow } from "xml-flow";

function progress(
  i: number,
  message: string,
  last?: { time: Date; i: number; diff: number },
) {
  const verbose =
    // Never verbose in CI; never verbose in Emacs except when in vterm
    !process.env.CI &&
    !(process.env.INSIDE_EMACS && !process.env.INSIDE_EMACS.includes("vterm"));
  if (verbose) {
    const now = {
      time: new Date(),
      i: i,
      diff: 0,
    };
    let diff: number;
    let update = false;
    if (last && now.time.getTime() - last.time.getTime() > 1000) {
      now.diff = i - last.i;
      update = true;
    }

    readline.cursorTo(process.stdout, 0);
    process.stdout.write(message + `${i + 1} items (${last?.diff || 0}/s)`);
    return update ? now : last || now;
  }
}

const variant = process.argv[2] || "jawiktionary";

fs.rmSync(`${variant}-articles.sqlite`, { force: true });
const db = new Database(`${variant}-articles.sqlite`);
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

console.log(`Inserting ${filename} into database...`);

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
let lastTime: { time: Date; i: number; diff: number } | undefined;
db.run("BEGIN TRANSACTION;");
xmlStream.on("tag:page", (page: RawPage) => {
  i++;
  if (page.ns !== "0") return;

  const revision = page.revision;
  let text: string;
  if (typeof revision.text === "object") {
    text = revision.text.$text;
  } else {
    text = revision.text;
  }

  const obj = {
    $id: Number.parseInt(page.id),
    $title: page.title,
    $text: text,
    $redirect: page.redirect || null,
    $revisionId: Number.parseInt(revision.id),
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
  lastTime = progress(i, "Inserted items: ", lastTime);
});

xmlStream.on("end", () => {
  console.log();
  console.log(`Inserted ${i} items`);
  console.log("Committing transaction...");
  db.run("COMMIT;");
  console.log("Committing transaction...done");
});
