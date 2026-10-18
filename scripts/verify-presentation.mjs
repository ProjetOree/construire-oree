import fs from "node:fs";
import path from "node:path";
import { unescape } from "html-escaper";

// Inspect the built text, including closed details. CSS cannot satisfy these checks.
const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const baseline = option("--baseline");
const output = option("--output");
const buildDir = path.resolve(option("--dist") || path.join(root, "dist"));
const checks = [];
const check = (name, pass, detail = "") => checks.push({ name, pass, detail });
const read = (route, directory = buildDir) =>
  fs.readFileSync(
    path.join(directory, route, route.endsWith(".html") ? "" : "index.html"),
    "utf8",
  );
const text = (html) =>
  unescape(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ");
const sitemap = fs.readFileSync(path.join(root, "dist/sitemap-0.xml"), "utf8");
const routes = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
  (match) => new URL(match[1]).pathname,
);
routes.push("/404.html");
const phrases = {
  "/a-propos/": [
    "et les conditions à examiner avant de le mettre à l’essai",
    "la feuille de route expose les étapes envisagées",
  ],
  "/ecosysteme/": ["La feuille de route présente les conditions"],
  "/projet/": [
    "Les Fondations expliquent ces deux circuits",
    "les quatre portraits de conception permettent de suivre",
    "vous pouvez partager une expérience",
  ],
  "/rejoindre/": [
    "sans engagement mutuel. Découvrir pourquoi",
    "suivre les nouvelles ou expliquer",
    "La feuille de route replace ces décisions",
    ...["Claire", "Marc", "Camille", "Julien"].map(
      (name) => `${name} (facultatif)`,
    ),
  ],
};
const values = (html, attribute) =>
  [...html.matchAll(new RegExp(`\\b${attribute}="([^"]*)"`, "g"))].map((m) =>
    unescape(m[1]),
  );
const destinations = (html) =>
  [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => unescape(m[1]));
for (const route of routes) {
  const html = read(route);
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || "";
  const rendered = text(main);
  check(`${route}: texte principal présent`, rendered.trim().length > 50);
  for (const phrase of phrases[route] || [])
    check(`${route}: espace textuel « ${phrase} »`, rendered.includes(phrase));
  const candidates = [];
  for (const m of main.matchAll(
    /<(a|strong|em|span|code)\b[^>]*>([\s\S]*?)<\/\1>/g,
  )) {
    const before = main.slice(Math.max(0, m.index - 60), m.index);
    const inside = text(m[2]);
    const after = main.slice(m.index + m[0].length, m.index + m[0].length + 60);
    if (
      (/[\p{L}\p{N}]$/u.test(before) && /^[\p{L}\p{N}]/u.test(inside)) ||
      (/[\p{L}\p{N}]$/u.test(inside) && /^[\p{L}\p{N}]/u.test(after)) ||
      (/[.!?]$/u.test(before) && /^\p{L}/u.test(inside))
    )
      candidates.push({ before, inside, after });
  }
  check(
    `${route}: aucun candidat de mots collés inline`,
    candidates.length === 0,
    candidates,
  );
  check(`${route}: un H1`, (main.match(/<h1\b/g) || []).length === 1);
  const ids = values(html, "id");
  check(`${route}: identifiants uniques`, new Set(ids).size === ids.length);
  check(
    `${route}: description présente`,
    /<meta name="description" content="[^"]+"/.test(html),
  );
  if (baseline) {
    const previous = read(route, path.resolve(baseline));
    check(
      `${route}: ancres préservées`,
      values(previous, "id").every((id) => ids.includes(id)),
    );
    check(
      `${route}: destinations préservées`,
      JSON.stringify(destinations(html)) ===
        JSON.stringify(destinations(previous)),
    );
  }
}
const result = {
  routes,
  pass: checks.every((c) => c.pass),
  count: checks.length,
  checks,
};
if (output)
  fs.writeFileSync(path.resolve(output), JSON.stringify(result, null, 2));
console.log(
  JSON.stringify(
    {
      pass: result.pass,
      pages: routes.length,
      checks: checks.length,
      failures: checks.filter((c) => !c.pass),
    },
    null,
    2,
  ),
);
if (!result.pass) process.exitCode = 1;
