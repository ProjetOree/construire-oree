import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { unescape } from "html-escaper";

const root = path.resolve(import.meta.dirname, "..");
// Fixed source baseline: documentary routes are removed by this mission.
const sourceRevision = "85729af310cd862fcf9407c7e6b2e917c3705b93";
const revision = process.argv.includes("--v3") ? "v3" : "v2";
const proof = path.resolve(
  root,
  "../Vault Orée/03 - Opérations/02 - Construction de Construire Orée/25 - Mission 031",
);
const archives = JSON.parse(
  fs.readFileSync(path.join(proof, "archives-conception-v1.json")),
);
const anchorMap = JSON.parse(
  fs.readFileSync(path.join(proof, "ancres-historiques.json")),
);
const strip = (value) =>
  unescape(value.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
const hash = (value) => createHash("sha256").update(value).digest("hex");
const checks = [];
const check = (name, pass, detail = "") => checks.push({ name, pass, detail });
const readRoute = (route) =>
  fs.readFileSync(path.join(root, "dist", route, "index.html"), "utf8");
for (const [name, doc] of Object.entries(archives)) {
  const html = readRoute(doc.destination);
  const original = execFileSync(
    "git",
    ["show", `${sourceRevision}:src/pages/documents/${name}.md`],
    { cwd: root },
  );
  const preserved = fs.readFileSync(
    path.join(root, "src/data/sources", `${name}.md`),
  );
  // Git normalizes working-tree line endings; source words and structure remain exact.
  check(
    `${name}: source Markdown identique au commit source (hors CRLF)`,
    original.toString().replace(/\r\n/g, "\n") ===
      preserved.toString().replace(/\r\n/g, "\n"),
    { hashPreserved: hash(preserved) },
  );
  check(
    name + ": aucune archive dans la page",
    !html.includes('class="source-prose"') &&
      !html.includes("data-source-details"),
  );
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  check(
    `${name}: IDs uniques`,
    new Set(ids).size === ids.length,
    ids.filter((id, i) => ids.indexOf(id) !== i),
  );
}
for (const anchor of anchorMap) {
  const [route, id] = anchor.destination.split("#");
  check(
    `ancre ${anchor.source}`,
    readRoute(route).includes(`id="${id}"`),
    anchor.destination,
  );
}
const aliases = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/anchor-aliases.json")),
);
for (const [route, entries] of Object.entries(aliases)) {
  const html = readRoute(route);
  for (const [id, target] of Object.entries(entries)) {
    check(
      route + "#" + id + ": alias vers le sujet",
      html.includes('id="' + id + '"') &&
        html.includes('data-anchor-target="' + target + '"') &&
        html.includes('id="' + target + '"'),
      target,
    );
  }
}
const pages = [];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) visit(path.join(dir, entry.name));
    else if (
      entry.name.endsWith(".html") &&
      entry.name !== "google6278819d051ae302.html"
    )
      pages.push(path.join(dir, entry.name));
  }
}
visit(path.join(root, "dist"));
const seo = [];
for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  const route =
    "/" +
    path
      .relative(path.join(root, "dist"), file)
      .replaceAll("\\", "/")
      .replace(/index.html$/, "");
  if (route.startsWith("/documents/")) continue;
  const title = strip(html.match(/<title>(.*?)<\/title>/)?.[1] || "");
  const description = unescape(
    html.match(/<meta name="description" content="([^"]*)"/)?.[1] || "",
  );
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const headings = [...html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/g)].map(
    (m) => ({ level: +m[1], text: strip(m[2]) }),
  );
  check(`${route}: un H1`, headings.filter((h) => h.level === 1).length === 1);
  check(`${route}: title et description`, !!title && !!description);
  if (route === "/404.html")
    check(`${route}: aucune canonical de page indexable`, !canonical);
  else
    check(
      `${route}: canonical unique`,
      (html.match(/rel="canonical"/g) || []).length === 1 &&
        canonical === `https://construire-oree.pages.dev${route}`,
    );
  seo.push({ route, title, description, canonical, headings });
  for (const match of html.matchAll(/href="(\/[^"\s]*)"/g)) {
    const url = new URL(
      unescape(match[1]),
      "https://construire-oree.pages.dev",
    );
    if (url.pathname.startsWith("/documents/")) {
      check(`${route}: lien ancien évité ${match[1]}`, false);
      continue;
    }
    const target = path.join(
      root,
      "dist",
      url.pathname,
      path.extname(url.pathname) ? "" : "index.html",
    );
    check(`${route}: lien ${match[1]}`, fs.existsSync(target));
    if (url.hash && fs.existsSync(target))
      check(
        `${route}: fragment ${match[1]}`,
        fs
          .readFileSync(target, "utf8")
          .includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),
      );
  }
}
const journal = fs.readFileSync(
  path.join(root, "src/content/journal/ce-qui-existe-aujourdhui.md"),
);
const journalOriginal = execFileSync(
  "git",
  ["show", `${sourceRevision}:src/content/journal/ce-qui-existe-aujourdhui.md`],
  { cwd: root },
);
check(
  "Journal historique inchangé",
  journal.toString().replace(/\r\n/g, "\n") ===
    journalOriginal.toString().replace(/\r\n/g, "\n"),
);
const report = {
  date: "2026-10-16",
  pass: checks.every((c) => c.pass),
  count: checks.length,
  checks,
};
fs.writeFileSync(
  path.join(proof, `verification-statique-${revision}.json`),
  JSON.stringify(report, null, 2),
);
fs.writeFileSync(
  path.join(proof, `seo-rendu-${revision}.json`),
  JSON.stringify(seo, null, 2),
);
console.log(
  JSON.stringify(
    {
      pass: report.pass,
      count: checks.length,
      failures: checks.filter((c) => !c.pass),
    },
    null,
    2,
  ),
);
if (!report.pass) process.exitCode = 1;
