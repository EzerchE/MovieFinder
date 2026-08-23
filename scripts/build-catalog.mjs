import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "data/movie_details.json");
const outputPath = resolve(root, "public/data/catalog.json");
const source = JSON.parse(await readFile(sourcePath, "utf8"));

const catalog = Object.entries(source)
  .filter(([, movie]) => !movie.adult && movie.title && movie.poster)
  .map(([id, movie]) => ({
    id: Number(id),
    title: movie.title,
    poster: movie.poster,
    genres: movie.genres || [],
    overview: movie.overview || "",
    runtime: movie.runtime || null,
    release_date: movie.release_date || "",
    trailer: movie.trailer || "",
    keywords: (movie.keywords || []).slice(0, 20)
  }));

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(catalog));
console.log(`Generated ${catalog.length.toLocaleString("tr-TR")} movie records.`);
