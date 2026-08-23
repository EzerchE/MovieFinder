const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const MEDIA_INSTANCE_IDS = new Set(["Q11424", "Q24869", "Q506240", "Q5398426", "Q1259759", "Q15416"]);
const TV_INSTANCE_IDS = new Set(["Q5398426", "Q1259759", "Q15416"]);

const genreTranslations = {
  Action: "Aksiyon", Adventure: "Macera", Animation: "Animasyon", Comedy: "Komedi",
  Crime: "Suç", Documentary: "Belgesel", Drama: "Dram", Family: "Aile",
  Fantasy: "Fantastik", History: "Tarih", Horror: "Korku", Music: "Müzik",
  Mystery: "Gizem", Romance: "Romantik", "Science Fiction": "Bilim Kurgu",
  Thriller: "Gerilim", War: "Savaş", Western: "Western"
};

function translateGenre(genre) {
  if (genreTranslations[genre]) return genreTranslations[genre];
  const normalized = normalizeText(genre);
  const contains = [
    ["science fiction", "Bilim Kurgu"], ["psychological thriller", "Gerilim"],
    ["thriller", "Gerilim"], ["black comedy", "Kara Komedi"], ["comedy", "Komedi"],
    ["crime", "Suç"], ["mystery", "Gizem"], ["horror", "Korku"],
    ["drama", "Dram"], ["documentary", "Belgesel"], ["animation", "Animasyon"],
    ["adventure", "Macera"], ["action", "Aksiyon"], ["fantasy", "Fantastik"],
    ["romance", "Romantik"], ["war", "Savaş"], ["history", "Tarih"]
  ];
  return contains.find(([term]) => normalized.includes(term))?.[1] || genre;
}

export const moodLabels = { dark: "Karanlık", thoughtful: "Düşündüren", tense: "Gerilimli", epic: "Epik" };

const moodRules = {
  dark: ["korku", "gerilim", "suç", "gizem", "horror", "thriller", "crime", "mystery", "noir", "cinayet", "dystopia", "serial killer", "psychological"],
  thoughtful: ["dram", "belgesel", "bilim kurgu", "drama", "documentary", "science fiction", "felsefe", "philosophy", "identity", "memory", "society", "time travel"],
  tense: ["gerilim", "suç", "gizem", "aksiyon", "thriller", "crime", "mystery", "action", "suspense", "investigation", "kidnapping", "survival"],
  epic: ["macera", "aksiyon", "fantastik", "bilim kurgu", "tarih", "savaş", "adventure", "action", "fantasy", "science fiction", "history", "war", "space opera", "battle", "superhero", "quest"]
};

export function normalizeText(value = "") {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function deriveMoods(item) {
  const haystack = normalizeText([...(item.genres || []), ...(item.keywords || []), item.summary || "", item.tagline || ""].join(" "));
  return Object.fromEntries(Object.entries(moodRules).map(([mood, terms]) => [mood, terms.reduce((score, term) => score + (haystack.includes(normalizeText(term)) ? 1 : 0), 0)]));
}

export function mapCatalogMovie(movie) {
  const year = Number(movie.release_date?.slice(0, 4)) || "—";
  const genres = (movie.genres || []).map(translateGenre);
  const item = {
    id: `tmdb-${movie.id}`,
    tmdbId: movie.id,
    title: movie.title,
    type: "Film",
    year,
    extra: movie.runtime ? `${movie.runtime} dk` : "Süre bilinmiyor",
    certificate: "—",
    poster: movie.poster?.replace("/w185/", "/w500/"),
    tagline: genres.length ? genres.slice(0, 3).join(" • ") : "Film",
    summary: movie.overview || "Bu içerik için Türkçe özet henüz bulunmuyor.",
    genres,
    keywords: movie.keywords || [],
    imdb: "—",
    imdbNote: "Puan verisi bekleniyor",
    rtCritic: "—",
    rtAudience: "—",
    trailer: movie.trailer || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} fragman`)}`,
    source: "catalog"
  };
  item.moodScores = deriveMoods(item);
  return item;
}

export async function loadMovieCatalog(baseUrl) {
  const response = await fetch(`${baseUrl}data/catalog.json`);
  if (!response.ok) throw new Error("Film kataloğu yüklenemedi.");
  return (await response.json()).map(mapCatalogMovie);
}

function claimValues(entity, property) {
  return (entity.claims?.[property] || [])
    .map(claim => claim.mainsnak?.datavalue?.value)
    .filter(value => value !== undefined && value !== null);
}

function claimIds(entity, property) {
  return claimValues(entity, property).map(value => value.id).filter(Boolean);
}

function label(entity) {
  return entity.labels?.tr?.value || entity.labels?.en?.value || entity.id;
}

async function wikidata(params) {
  const query = new URLSearchParams({ ...params, format: "json", origin: "*" });
  const response = await fetch(`${WIKIDATA_API}?${query}`);
  if (!response.ok) throw new Error("Çevrimiçi arama şu anda yanıt vermiyor.");
  return response.json();
}

function isMediaEntity(entity) {
  const instances = claimIds(entity, "P31");
  const description = normalizeText(`${entity.descriptions?.tr?.value || ""} ${entity.descriptions?.en?.value || ""}`);
  return instances.some(id => MEDIA_INSTANCE_IDS.has(id)) || /(film|televizyon dizisi|television series|tv series|miniseries)/.test(description);
}

export async function searchWikidata(searchTerm) {
  const searches = await Promise.all(["tr", "en"].map(language => wikidata({
    action: "wbsearchentities", search: searchTerm, language, uselang: "tr", type: "item", limit: "12"
  })));
  const ids = [...new Set(searches.flatMap(result => result.search || []).map(result => result.id))].slice(0, 20);
  if (!ids.length) return [];

  const entityPayload = await wikidata({
    action: "wbgetentities", ids: ids.join("|"), props: "labels|descriptions|claims", languages: "tr|en"
  });
  const mediaEntities = Object.values(entityPayload.entities || {}).filter(isMediaEntity);
  const relatedIds = [...new Set(mediaEntities.flatMap(entity => claimIds(entity, "P136")).slice(0, 50))];
  let related = {};
  if (relatedIds.length) {
    related = (await wikidata({ action: "wbgetentities", ids: relatedIds.join("|"), props: "labels", languages: "tr|en" })).entities || {};
  }

  return mediaEntities.map(entity => {
    const instances = claimIds(entity, "P31");
    const description = entity.descriptions?.tr?.value || entity.descriptions?.en?.value || "Çevrimiçi katalog sonucu";
    const isTv = instances.some(id => TV_INSTANCE_IDS.has(id)) || /(televizyon dizisi|television series|tv series|miniseries)/.test(normalizeText(description));
    const release = claimValues(entity, "P577")[0]?.time?.match(/([12]\d{3})/)?.[1] || description.match(/\b((?:19|20)\d{2})\b/)?.[1];
    const runtime = claimValues(entity, "P2047")[0]?.amount;
    const image = claimValues(entity, "P18")[0];
    const genres = [...new Set(claimIds(entity, "P136").slice(0, 5).map(id => related[id] ? translateGenre(label(related[id])) : null).filter(Boolean))];
    const tmdbId = claimValues(entity, isTv ? "P4983" : "P4947")[0];
    const title = label(entity);
    const item = {
      id: `wd-${entity.id}`,
      wikidataId: entity.id,
      tmdbId: tmdbId ? Number(tmdbId) : null,
      title,
      type: isTv ? "Dizi" : "Film",
      year: release || "—",
      extra: runtime ? `${Math.round(Number(runtime))} dk` : (isTv ? "Sezon bilgisi yok" : "Süre bilinmiyor"),
      certificate: "—",
      poster: image ? `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(image)}?width=500` : "",
      tagline: description,
      summary: description,
      genres: genres.length ? genres : [isTv ? "Dizi" : "Film"],
      keywords: [],
      imdbId: claimValues(entity, "P345")[0] || null,
      imdb: "—",
      imdbNote: "Puan verisi bekleniyor",
      rtCritic: "—",
      rtAudience: "—",
      trailer: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} fragman`)}`,
      source: "wikidata"
    };
    item.moodScores = deriveMoods(item);
    return item;
  });
}

export function recommendationScore(current, candidate, mood, savedItems = []) {
  const currentGenres = new Set((current.genres || []).map(normalizeText));
  const candidateGenres = new Set((candidate.genres || []).map(normalizeText));
  const currentKeywords = new Set((current.keywords || []).map(normalizeText));
  const candidateKeywords = new Set((candidate.keywords || []).map(normalizeText));
  const sharedGenres = [...candidateGenres].filter(genre => currentGenres.has(genre)).length;
  const sharedKeywords = [...candidateKeywords].filter(keyword => currentKeywords.has(keyword)).length;
  const savedGenres = new Set(savedItems.flatMap(item => (item.genres || []).map(normalizeText)));
  const tasteOverlap = [...candidateGenres].filter(genre => savedGenres.has(genre)).length;
  const moodFit = candidate.moodScores?.[mood] || 0;
  const typeBonus = candidate.type === current.type ? 2 : 0;
  return moodFit * 12 + sharedGenres * 9 + Math.min(sharedKeywords, 4) * 3 + tasteOverlap * 2 + typeBonus;
}
