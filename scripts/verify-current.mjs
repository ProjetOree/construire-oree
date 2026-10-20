import fs from "node:fs";
import path from "node:path";
import { unescape } from "html-escaper";

// Current build only: no Git, Vault, recursive inventory, network or historical SHA.
const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!["--dist", "--output"].includes(args[i]) || !args[i + 1])
    throw new Error(
      "Usage: verify-current.mjs [--dist directory] [--output file.json]",
    );
  options[args[i]] = args[i + 1];
}

// Check before any filesystem access, including output and URL-derived paths.
function permitted(value) {
  let decoded = String(value);
  for (let i = 0; i < 5; i++) {
    const next = decodeURIComponent(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  if (
    decoded.includes("\0") ||
    /(^|[/\\])design-qa\.md($|[/\\])/i.test(decoded)
  )
    throw new Error("Reserved path refused before filesystem access");
  return value;
}
const buildDir = path.resolve(
  permitted(options["--dist"] || path.join(root, "dist")),
);
const output =
  options["--output"] && path.resolve(permitted(options["--output"]));
function bounded(base, relative) {
  permitted(relative);
  const file = path.resolve(base, relative);
  if (!file.startsWith(base + path.sep))
    throw new Error("Path outside allowed directory");
  permitted(file);
  if (fs.existsSync(file)) {
    const actual = permitted(fs.realpathSync(file));
    const actualBase = permitted(fs.realpathSync(base));
    if (!actual.startsWith(actualBase + path.sep))
      throw new Error("Symlink outside allowed directory");
  }
  return file;
}
const readBuild = (relative) =>
  fs.readFileSync(bounded(buildDir, relative), "utf8");
const readSource = (relative) =>
  fs.readFileSync(bounded(root, relative), "utf8");
const text = (html) =>
  unescape(html.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
const attributes = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => [
      m[1],
      unescape(m[2] ?? m[3]),
    ]),
  );
const tags = (html, name) =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map((m) =>
    attributes(m[0]),
  );
const checks = [];
const check = (name, pass, detail = "") =>
  checks.push({ name, pass: !!pass, detail });
const pages = new Map();
const fileFor = (pathname) => {
  permitted(pathname);
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  return path.posix.extname(relative) ? relative : relative + "index.html";
};
const required = [
  "/",
  "/projet/",
  "/ecosysteme/",
  "/fondations/",
  "/a-propos/",
  "/avancement/",
  "/roadmap/",
  "/decisions/",
  "/tableau-de-bord/",
  "/rejoindre/",
  "/journal/",
  "/liens/",
];

try {
  const sitemap = readBuild("sitemap-0.xml");
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    (m) => new URL(unescape(m[1])),
  );
  if (!urls.length) throw new Error("Empty sitemap; run npm run build first");
  const origin = urls[0].origin;
  const routes = urls.map((url) => url.pathname);
  check("Sitemap: unique routes", new Set(routes).size === routes.length);
  check(
    "Sitemap: same origin, no query or fragment",
    urls.every((url) => url.origin === origin && !url.search && !url.hash),
  );
  for (const route of required)
    check(`Sitemap: ${route}`, routes.includes(route));
  for (const route of new Set([...routes, ...required, "/404.html"])) {
    try {
      const html = readBuild(fileFor(route));
      const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || "";
      const ids = tags(html, "[a-z][a-z0-9-]*")
        .map((tag) => tag.id)
        .filter(Boolean);
      pages.set(route, { html, main, ids: new Set(ids) });
      check(
        `${route}: one main and H1`,
        (html.match(/<main\b/g) || []).length === 1 &&
          (main.match(/<h1\b/g) || []).length === 1 &&
          text(main).length > 50,
      );
      check(`${route}: unique IDs`, new Set(ids).size === ids.length);
      check(
        `${route}: French and viewport`,
        tags(html, "html")[0]?.lang === "fr" &&
          tags(html, "meta").some(
            (tag) =>
              tag.name === "viewport" &&
              tag.content?.includes("width=device-width"),
          ),
      );
      const metas = tags(html, "meta");
      const description = metas.find(
        (tag) => tag.name === "description",
      )?.content;
      const title = text(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
      Object.assign(pages.get(route), { title, description });
      check(`${route}: title and description`, title && description);
      check(
        `${route}: social metadata`,
        ["og:title", "og:description", "og:image"].every((name) =>
          metas.some((tag) => tag.property === name && tag.content),
        ) &&
          metas.some(
            (tag) =>
              tag.name === "twitter:card" &&
              tag.content === "summary_large_image",
          ),
      );
      if (route !== "/404.html")
        check(
          `${route}: canonical`,
          tags(html, "link").some(
            (tag) => tag.rel === "canonical" && tag.href === origin + route,
          ),
        );
      check(
        `${route}: no noindex`,
        !metas.some(
          (tag) =>
            /^(robots|googlebot)$/.test(tag.name || "") &&
            /noindex/i.test(tag.content || ""),
        ),
      );
      check(
        `${route}: skip link and native menu`,
        ids.includes("contenu") &&
          tags(html, "a").some((tag) => tag.href === "#contenu") &&
          /<details\b[^>]*data-seuil-menu[\s\S]*?<summary\b/.test(html),
      );
      for (const match of html.matchAll(/<details\b([^>]*)>/g)) {
        if (match[1].includes("data-editorial-details"))
          check(
            `${route}: editorial detail open without JS (${attributes(match[0]).id})`,
            /(?:^|\s)open(?:\s|=|$)/.test(match[1]),
          );
      }
    } catch (error) {
      check(`${route}: readable build`, false, error.message);
    }
  }
  for (const field of ["title", "description"])
    check(
      `Pages: unique ${field}`,
      new Set([...pages.values()].map((page) => page[field])).size ===
        pages.size,
    );
  for (const [route, { html }] of pages) {
    for (const { href } of tags(html, "a")) {
      if (!href || /^(mailto:|tel:)/i.test(href)) continue;
      const url = new URL(href, origin + route);
      if (url.origin !== origin) continue;
      try {
        const file = bounded(buildDir, fileFor(url.pathname));
        const exists = fs.existsSync(file) && fs.statSync(file).isFile();
        check(`${route}: link ${href}`, exists);
        if (exists && url.hash) {
          const target = readBuild(fileFor(url.pathname));
          check(
            `${route}: fragment ${href}`,
            tags(target, "[a-z][a-z0-9-]*").some(
              (tag) => tag.id === decodeURIComponent(url.hash.slice(1)),
            ),
          );
        }
      } catch (error) {
        check(`${route}: allowed link`, false, error.message);
      }
    }
    for (const tag of tags(html, "[a-z][a-z0-9-]*")) {
      for (const name of ["aria-labelledby", "aria-describedby"])
        if (tag[name])
          check(
            `${route}: ${name} ${tag[name]}`,
            tag[name].split(/\s+/).every((id) => pages.get(route).ids.has(id)),
          );
    }
  }
  const aliases = JSON.parse(readSource("src/data/anchor-aliases.json"));
  for (const [route, entries] of Object.entries(aliases)) {
    const page = pages.get(route);
    for (const [alias, target] of Object.entries(entries))
      check(
        `${route}: alias ${alias} -> ${target}`,
        page?.ids.has(target) &&
          tags(page.html, "span").some(
            (tag) => tag.id === alias && tag["data-anchor-target"] === target,
          ),
      );
  }
  const redirects = readSource("public/_redirects")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line) => line.trim().split(/\s+/));
  for (const [from, to, status] of redirects)
    check(`Redirect ${from} -> ${to}`, status === "301" && pages.has(to));
  for (const base of [
    "/documents",
    "/documents/profils",
    "/documents/blueprint-technique-fiscal",
    "/documents/roadmap",
    "/documents/rejoindre",
  ])
    for (const suffix of ["", "/", "/index.html"])
      check(
        `Legacy route ${base + suffix}`,
        redirects.some(([from]) => from === base + suffix),
      );

  const rss = readBuild("rss.xml");
  const items = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  const articleRoutes = routes.filter(
    (route) => route.startsWith("/journal/") && route !== "/journal/",
  );
  const rssRoutes = items.map(
    (item) =>
      new URL(text(item.match(/<link>(.*?)<\/link>/)?.[1] || "")).pathname,
  );
  check(
    "RSS and published article routes agree",
    items.length === articleRoutes.length &&
      articleRoutes.every((route) => rssRoutes.includes(route)),
  );
  const home = pages.get("/")?.main || "";
  const journalBlock =
    home.match(
      /<section\b[^>]*aria-labelledby="journal-title"[^>]*>([\s\S]*?)<\/section>/,
    )?.[1] || "";
  if (items.length) {
    const latest = items[0];
    const isoDate = new Date(
      text(latest.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ""),
    )
      .toISOString()
      .slice(0, 10);
    const firstTime = tags(journalBlock, "time")[0];
    const article = pages.get(rssRoutes[0]);
    check(
      "Latest date agrees: home / article / list / RSS",
      firstTime?.datetime === isoDate &&
        tags(article?.main || "", "time")[0]?.datetime === isoDate &&
        tags(pages.get("/journal/")?.main || "", "time")[0]?.datetime ===
          isoDate,
    );
    check(
      "Latest article linked from home",
      tags(journalBlock, "a").some((tag) => tag.href === rssRoutes[0]),
    );
    check(
      "Dated trace links to current state",
      tags(journalBlock, "a").some((tag) => tag.href === "/avancement/"),
    );
    check(
      "Article retains historical context",
      text(article?.main || "").includes("trace publiée à la date indiquée"),
    );
  }
  const about = pages.get("/a-propos/")?.main || "";
  const conclusion =
    about.match(
      /<section\b[^>]*aria-labelledby="ouverte-title"[^>]*>([\s\S]*?)<\/section>/,
    )?.[1] || "";
  check(
    "About: one participation exit in conclusion",
    tags(conclusion, "a").filter((tag) => tag.href === "/rejoindre/").length ===
      1,
  );
  check(
    "About: personal responsibility and limits retained",
    [
      "Je porte aujourd’hui le projet seul",
      "outils d’IA",
      "n’engagent aucune des parties",
      "garantir de délai de réponse",
      "formulaires Tally externes",
    ].every((phrase) => text(conclusion).includes(phrase)),
  );
  const join = pages.get("/rejoindre/")?.main || "";
  const doors =
    join.match(/<ul\b[^>]*class="intent-grid"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ||
    "";
  check(
    "Participation: three doors remain",
    (doors.match(/<li\b/g) || []).length === 3 &&
      tags(doors, "a").filter((tag) => tag.href === "https://tally.so/r/685NbB")
        .length === 2 &&
      tags(doors, "a").some((tag) => tag.href === "https://tally.so/r/q4eVx7"),
  );
} catch (error) {
  check("Recipe inputs", false, error.message);
}

const result = {
  generatedAt: new Date().toISOString(),
  buildDir,
  pass: checks.every((item) => item.pass),
  pages: pages.size,
  count: checks.length,
  checks,
  limits:
    "Static built HTML only. No browser, HTTP, service writes, human tests or historical conservation proof.",
};
if (output) {
  permitted(output);
  if (fs.existsSync(output)) permitted(fs.realpathSync(output));
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
}
console.log(
  JSON.stringify(
    {
      pass: result.pass,
      pages: result.pages,
      checks: result.count,
      failures: checks.filter((item) => !item.pass),
    },
    null,
    2,
  ),
);
if (!result.pass) process.exitCode = 1;
