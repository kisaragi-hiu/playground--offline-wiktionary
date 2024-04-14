import * as fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Archive } from "@openzim/libzim";
import Database from "better-sqlite3";

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

fs.rmSync(`${variant}-zim-articles.sqlite`, { force: true });
const db = new Database(`${variant}-zim-articles.sqlite`);
db.exec(`
CREATE TABLE pages (
  --id INTEGER PRIMARY KEY,
  path TEXT,
  title TEXT,
  data BLOB,
  redirect TEXT
)`);

const zimFile = "wiktionary_ja_all_maxi_2024-04.zim";
const archive = new Archive(zimFile);
console.log(`Inserting ${zimFile} into database...`);

const insert = db.prepare(
  "INSERT INTO pages (path,title,data,redirect) VALUES ($path,$title,$data,$redirect)",
);
console.log("Inserting data from .zim file...");
let i = 0;
let lastTime: { time: Date; i: number; diff: number } | undefined;
db.exec("BEGIN TRANSACTION;");
for (const entry of archive.iterByPath()) {
  i++;
  // JS, CSS, etc.; Images; Zim metadata; Search index
  if (["-", "I", "M", "X"].includes(entry.path[0])) continue;
  if (i <= 2000) continue;
  if (!entry.title.endsWith("用語集")) continue;
  console.log(`i: ${i}\npath: ${entry.path}\ndata:`);
  console.log(entry.item.data.toString());
  process.exit(0);
  const isRedirect = entry.isRedirect;
  const item = entry.getItem(true);
  const obj = {
    $path: entry.path,
    $title: entry.title,
    // If it's already a redirect, the text content is redundant
    $data: isRedirect ? null : item.data.data,
    $redirect: isRedirect ? item.path : null,
  };
  try {
    insert.run(obj);
  } catch (e) {
    console.error(JSON.stringify(obj));
    console.error(JSON.stringify(e));
    throw e;
  }
  lastTime = progress(i, "Inserted items: ", lastTime);
}

console.log();
console.log(`Inserted ${i} items`);
console.log("Committing transaction...");
db.exec("COMMIT;");
console.log("Committing transaction...done");

console.log("Inserting data from HTML dump...");

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
