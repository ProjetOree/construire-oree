import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename } from "node:path";

const ORIGIN = "https://construire-oree.pages.dev";
const HOST = new URL(ORIGIN).host;

// IndexNow keys are public ownership proofs, not private API credentials.
const candidates = readdirSync("public").filter((name) => {
  const match = /^([A-Za-z0-9-]{8,128})\.txt$/.exec(name);
  return match && readFileSync("public/" + name, "utf8").trim() === match[1];
});
if (candidates.length !== 1) {
  throw new Error("Expected exactly one IndexNow verification file in public/");
}
const key = basename(candidates[0], ".txt");
const keyLocation = ORIGIN + "/" + key + ".txt";

async function getText(url) {
  const parsed = new URL(url);
  if (parsed.origin !== ORIGIN) throw new Error("Unexpected sitemap/key host: " + url);
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), cache: "no-store" });
  if (!response.ok) throw new Error("HTTP " + response.status + " when reading " + url);
  return response.text();
}

const published = new Set();
const keyAtOrigin = (await getText(keyLocation)).trim();
if (keyAtOrigin !== key) {
  throw new Error("IndexNow verification key does not match the published file");
}
const indexXml = await getText(ORIGIN + "/sitemap-index.xml");
const sitemapFiles = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (sitemapFiles.length === 0) throw new Error("The sitemap index has no child sitemaps");
for (const sitemapUrl of sitemapFiles) {
  const xml = await getText(sitemapUrl);
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = new URL(match[1]);
    if (url.origin !== ORIGIN) throw new Error("External URL found in sitemap: " + url);
    published.add(url.pathname);
  }
}
if (published.size === 0) throw new Error("No published URLs found in sitemap");

const diff = execFileSync(
  "git",
  ["diff", "--name-status", "--no-renames", "HEAD^", "HEAD"],
  { encoding: "utf8" }
);
const changed = diff.trim().split("\n").filter(Boolean).map((line) => {
  const [status, file] = line.split("\t");
  return { status, file };
});
const routes = new Set();
const add = (route, deleted = false) => {
  if (deleted || published.has(route)) routes.add(route);
};
const addAll = () => { for (const route of published) add(route); };
const addJournal = () => {
  for (const route of published) if (route.startsWith("/journal/")) add(route);
};
function routeFromPage(file) {
  if (!file.startsWith("src/pages/") || !file.endsWith(".astro")) return null;
  let route = file.slice("src/pages/".length).replace(/\.astro$/, "");
  if (route === "404") return null;
  if (route.includes("[") || route.includes("]")) return "dynamic";
  route = route.replace(/(^|\/)index$/, "");
  return route ? "/" + route.replace(/\/$/, "") + "/" : "/";
}

for (const { status, file } of changed) {
  const deleted = status === "D";
  if (
    /^(src\/(components|layouts|config|data|assets)\/|src\/content\.config\.ts$|astro\.config\.mjs$)/.test(file)
  ) {
    addAll();
  } else if (/^src\/content\/journal\/.*\.(md|mdx)$/.test(file)) {
    add("/");
    add("/journal/");
    const id = basename(file).replace(/\.(md|mdx)$/, "");
    add("/journal/" + id + "/", deleted);
  } else if (file.startsWith("src/pages/")) {
    const route = routeFromPage(file);
    if (route === "dynamic") {
      if (file.startsWith("src/pages/journal/")) addJournal();
      else addAll();
    } else if (route) {
      add(route, deleted);
    }
  } else if (
    file.startsWith("public/") &&
    !/^public\/(?:_headers|_redirects|robots\.txt|[A-Za-z0-9-]{8,128}\.txt)$/.test(file)
  ) {
    addAll();
  }
}

const urlList = [...routes].sort().map((route) => ORIGIN + route);
if (urlList.length === 0) {
  console.log("IndexNow ownership verified; no changed public page URLs in this deployment.");
  process.exit(0);
}
const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key, keyLocation, urlList }),
  signal: AbortSignal.timeout(20000),
});
if (![200, 202].includes(response.status)) {
  throw new Error("IndexNow returned HTTP " + response.status + ": " + (await response.text()).slice(0, 500));
}
console.log("IndexNow accepted " + urlList.length + " changed URL(s); HTTP " + response.status);
for (const url of urlList) console.log("  " + url);
