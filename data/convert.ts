import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import readline from "node:readline";
import type { Readable } from "node:stream";
import { TextDecoderStream } from "@stardazed/streams-text-encoding";
import { ConcatenatedJsonParseStream } from "@std/json";
import { pathToFileURL } from "bun";
import { default as flow } from "xml-flow";
import type { RawPage } from "./types.ts";

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

fs.rmSync(`${variant}-articles.sqlite`, { force: true });
const db = new Database(`${variant}-articles.sqlite`);
db.run(`
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

const xmlFile = `${variant}-latest-pages-articles.xml`;
const xmlStream = flow(fs.createReadStream(xmlFile)) as Readable;
const htmlFile = `${variant}-htmldump.ndjson`;
const htmlData = (await fetch(pathToFileURL(htmlFile)))
  .body as ReadableStream<Uint8Array>;
const htmlStream = htmlData
  .pipeThrough(new TextDecoderStream("utf-8", {}))
  .pipeThrough(new ConcatenatedJsonParseStream());

console.log(`Inserting ${xmlFile} into database...`);

const insert = db.prepare(
  "INSERT INTO pages (id,title,text,redirect,revisionId,lastModified,lastContributor) VALUES ($id,$title,$text,$redirect,$revisionId,$lastModified,$lastContributor)",
);
console.log("Inserting data from XML dump...");
let i = 0;
let lastTime: { time: Date; i: number; diff: number } | undefined;
db.run("BEGIN TRANSACTION;");
xmlStream.on("tag:page", (page: RawPage) => {
  i++;
  // pages, categories, appendix, thesaurus
  if (!["0", "14", "100", "110"].includes(page.ns)) return;

  const revision = page.revision;
  let text: string | undefined;
  // The HTML dump does not include appendix and thesaurus
  // There's also a few entries that aren't in the dump for some reason
  if (typeof revision.text === "object") {
    text = revision.text.$text;
  } else {
    text = revision.text;
  }

  const obj = {
    $id: Number.parseInt(page.id),
    $title: page.title,
    // If it's already a redirect, the text content is redundant
    $text: text && !page.redirect ? text : null,
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
  // @ts-ignore what the fuck are you on about a ReadableStream not being for-awaitable
  for await (const obj of htmlStream) {
    j++;
    const html = obj.article_body.html as string;
    update.run({
      $text: html.replace(/.*<\/head>/s, ""),
      $id: obj.identifier,
      $categories: JSON.stringify(obj.categories?.map((x: any) => x.name)),
    });
    lastTime = progress(j, "Inserted items: ", lastTime);
  }
  console.log();
  console.log("Committing transaction...");
  db.run("COMMIT;");
  console.log("Committing transaction...done");

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
