import { Database } from "bun:sqlite";
import { open, rm } from "node:fs/promises";
import readline from "node:readline";
import type { Readable } from "node:stream";
import { parse } from "ndjson";
import { default as flow } from "xml-flow";
import type { Article, RawPage } from "./types.ts";

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

const variant = process.argv[2] || "zh_min_nanwiktionary";
const htmldumpDir = process.argv[3] || "./";

await rm(`${htmldumpDir}${variant}-articles.sqlite`, { force: true });
const db = new Database(`${htmldumpDir}${variant}-articles.sqlite`);
db.run(`
PRAGMA auto_vacuum = 1;
CREATE TABLE pages (
  id INTEGER PRIMARY KEY,
  title TEXT,
  text TEXT,
  categories TEXT,
  redirect TEXT,
  revisionId INTEGER,
  lastModified TEXT,
  lastContributor TEXT
)`);

const xmlPath = `${variant}-latest-pages-articles.xml`;
const xmlFile = await open(xmlPath);
const xmlStream = flow(xmlFile.createReadStream()) as Readable;

console.log(`Inserting ${xmlPath} into database...`);

const insert = db.prepare(
  "INSERT INTO pages (id,title,text,redirect,revisionId,lastModified,lastContributor) VALUES (?,?,?,?,?,?,?)",
);
// This would be a large record of every category to its page ID
// On the other hand, enwiktionary's NS14 is 7.2G uncompressed including the raw
// HTML, so maybe it's not that bad...
const categories: Record<string, number> = {};
console.log("Inserting data from XML dump...");
let i = 0;
let lastTime: { time: Date; i: number; diff: number } | undefined;
db.run("BEGIN TRANSACTION;");
xmlStream.on("tag:page", (page: RawPage) => {
  i++;
  // pages, categories, appendix, thesaurus
  if (
    page.ns !== "0" &&
    page.ns !== "14" &&
    page.ns !== "100" &&
    page.ns !== "110"
  )
    return;

  // Remember categories for later
  const id = Number.parseInt(page.id);
  if (page.ns === "14") {
    categories[page.title] = id;
  }

  const revision = page.revision;
  let text: string | undefined;
  // The HTML dump does not include appendix and thesaurus
  // There's also a few entries that aren't in the dump for some reason
  if (typeof revision.text === "object") {
    text = revision.text.$text;
  } else {
    text = revision.text;
  }

  try {
    insert.run(
      id,
      page.title,
      // If it's already a redirect, the text content is redundant
      text && !page.redirect ? text : null,
      page.redirect || null,
      Number.parseInt(revision.id),
      revision.timestamp,
      revision.contributor.username,
    );
  } catch (e) {
    console.error(
      JSON.stringify({
        $id: id,
        $title: page.title,
        // If it's already a redirect, the text content is redundant
        $text: text && !page.redirect ? text : null,
        $redirect: page.redirect || null,
        $revisionId: Number.parseInt(revision.id),
        $lastModified: revision.timestamp,
        $lastContributor: revision.contributor.username,
      }),
    );
    console.error(JSON.stringify(e));
    throw e;
  }
  lastTime = progress(i, "Inserted items: ", lastTime);
});

xmlStream.on("end", async () => {
  console.log();
  console.log(`Inserted ${i} items`);
  console.log("Committing transaction...");
  db.run("COMMIT;");
  console.log("Committing transaction...done");

  console.log("Inserting data from HTML dump...");

  const update = db.prepare(`UPDATE pages
SET text = $text,
    categories = $categories
WHERE id = $id`);
  let j = 0;
  let lastTime: { time: Date; i: number; diff: number } | undefined;
  db.run("BEGIN TRANSACTION;");

  const htmlPath = `${htmldumpDir}${variant}-htmldump.ndjson`;
  const htmlFile = await open(htmlPath);
  for await (const rawObj of htmlFile.createReadStream().pipe(parse())) {
    j++;
    const obj = rawObj as Article;
    const html = obj.article_body.html;
    update.run({
      $text: html
        .replace(/.*<\/head>/s, "")
        .replace(/(class|style)="[^"]*"/g, "")
        .replace(/data-mw=[^ ]+ /g, "")
        .replace(/<\/html>/g, ""),
      $id: obj.identifier,
      // Storing the IDs in an JSON array should take much less space than
      // storing the names.
      $categories: JSON.stringify(
        obj.categories?.map(({ name }) => categories[name] || name),
      ),
    });
    lastTime = progress(j, "Inserted items: ", lastTime);
  }
  console.log();
  console.log("Committing transaction...");
  db.run("COMMIT;");
  console.log("Committing transaction...done");
  // console.log("Vacuuming...");
  // db.run("VACUUM;");
  // console.log("Vacuuming...done");

  //   console.log("Compressing DB...");
  //   db.loadExtension(
  //     "./sqlite_zstd-v0.3.2-x86_64-unknown-linux-gnu/libsqlite_zstd.so",
  //   );
  //   db.run(`
  // select zstd_enable_transparent('{"table": "pages",
  //     "column": "text", "compression_level": 19,
  //     "dict_chooser": "''i.'' || (id / 1000000)"}');
  // select zstd_incremental_maintenance(null, 1);
  // vacuum;
  // `);
  //   console.log("Compressing DB...done");
});
