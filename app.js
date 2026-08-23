import {
  deriveMoods,
  loadMovieCatalog,
  moodLabels,
  normalizeText,
  recommendationScore,
  searchWikidata
} from "./catalog.js";

const asset = path => `${import.meta.env.BASE_URL}${path}`;
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[character]);

let catalog = [
  {id:"lanterns",title:"Lanterns",type:"Dizi",year:2026,extra:"1 Sezon",certificate:"18+",poster:asset("posters/lanterns.jpg"),match:96,tagline:"Kozmik bir suç. Dünyaya ait karanlık bir sır.",summary:"Yeni üye John Stewart ve efsanevi Lantern Hal Jordan, Amerika'nın kalbinde işlenen bir cinayeti araştırırken kendilerini hem dünyayı hem de birliklerini sarsacak bir komplonun içinde bulur.",genres:["Suç","Gizem","Bilim Kurgu","Dram"],keywords:["cinayet","soruşturma","komplo","kozmik"],imdb:"—",imdbNote:"Yeni dizi",rtCritic:"94%",rtAudience:"83%",trailer:"https://www.youtube.com/watch?v=XmcIjxwLJcY",source:"featured",moods:["dark","tense","epic"]},
  {id:"the-batman",title:"The Batman",type:"Film",year:2022,extra:"2s 56dk",certificate:"13+",poster:asset("posters/the-batman.jpg"),match:93,tagline:"Korku bir araçtır. Gerçek ise daha karanlık.",summary:"Batman, Gotham'ın seçkinlerini hedef alan bir katilin bıraktığı şifreleri takip ederken şehrin geçmişine uzanan büyük bir yozlaşmayı açığa çıkarır.",genres:["Suç","Gizem","Gerilim"],keywords:["cinayet","soruşturma","noir"],imdbId:"tt1877830",tmdbId:414906,imdb:"7.8",imdbNote:"IMDb puanı",rtCritic:"85%",rtAudience:"87%",trailer:"https://www.youtube.com/watch?v=mqqft2x_Aa4",source:"featured",moods:["dark","tense"]},
  {id:"arrival",title:"Arrival",type:"Film",year:2016,extra:"1s 56dk",certificate:"13+",poster:asset("posters/arrival.jpg"),match:91,tagline:"İletişim kurmak, zamanı değiştirebilir.",summary:"Dünyanın farklı noktalarına gizemli uzay araçları indiğinde bir dilbilimci, ziyaretçilerin niyetini çözmek için zamana karşı yarışır.",genres:["Bilim Kurgu","Gizem","Dram"],keywords:["iletişim","zaman","uzaylı","dil"],imdbId:"tt2543164",tmdbId:329865,imdb:"7.9",imdbNote:"IMDb puanı",rtCritic:"94%",rtAudience:"82%",trailer:"https://www.youtube.com/watch?v=tFMo3UJ4B4g",source:"featured",moods:["thoughtful","epic"]},
  {id:"prisoners",title:"Prisoners",type:"Film",year:2013,extra:"2s 33dk",certificate:"18+",poster:asset("posters/prisoners.jpg"),match:89,tagline:"Bir baba ne kadar ileri gidebilir?",summary:"Kızı kaybolan bir baba, soruşturmadan sonuç çıkmayınca adaleti kendi ellerine alır ve ahlaki sınırları geri dönülmez biçimde aşar.",genres:["Suç","Gizem","Gerilim"],keywords:["kaçırılma","soruşturma","ahlak"],imdbId:"tt1392214",tmdbId:146233,imdb:"8.2",imdbNote:"IMDb puanı",rtCritic:"81%",rtAudience:"87%",trailer:"https://www.youtube.com/watch?v=bpXfcTF6iVk",source:"featured",moods:["dark","tense"]},
  {id:"blade-runner",title:"Blade Runner 2049",type:"Film",year:2017,extra:"2s 44dk",certificate:"15+",poster:asset("posters/blade-runner-2049.jpg"),match:88,tagline:"İnsan olmak ne demek?",summary:"Genç bir blade runner, toplumdan geriye kalanları kaosa sürükleyebilecek eski bir sırrı keşfeder ve yıllardır kayıp olan Rick Deckard'ı aramaya koyulur.",genres:["Bilim Kurgu","Gizem","Dram"],keywords:["kimlik","gelecek","distopya","yapay zeka"],imdbId:"tt1856101",tmdbId:335984,imdb:"8.0",imdbNote:"IMDb puanı",rtCritic:"88%",rtAudience:"88%",trailer:"https://www.youtube.com/watch?v=gCcx85zbxz4",source:"featured",moods:["dark","thoughtful","epic"]},
  {id:"watchmen",title:"Watchmen",type:"Film",year:2009,extra:"2s 43dk",certificate:"18+",poster:asset("posters/watchmen.jpg"),match:86,tagline:"Bizi kim gözetleyecek?",summary:"Alternatif bir 1985'te emekli bir kahramanın öldürülmesi, eski takım arkadaşlarını insanlığın kaderine uzanan karanlık bir komployla yüzleştirir.",genres:["Gizem","Aksiyon","Bilim Kurgu"],keywords:["süper kahraman","komplo","alternatif tarih"],imdbId:"tt0409459",tmdbId:13183,imdb:"7.6",imdbNote:"IMDb puanı",rtCritic:"65%",rtAudience:"71%",trailer:"https://www.youtube.com/watch?v=wdiHDzT6YbQ",source:"featured",moods:["dark","epic"]}
];

for (const item of catalog) {
  item.moodScores = deriveMoods(item);
  for (const mood of item.moods || []) item.moodScores[mood] = (item.moodScores[mood] || 0) + 2;
}

const regions = {
  TR:{flag:"🇹🇷",name:"Türkiye",locale:"tr-TR"},
  US:{flag:"🇺🇸",name:"Amerika",locale:"en-US"},
  GB:{flag:"🇬🇧",name:"Birleşik Krallık",locale:"en-GB"},
  DE:{flag:"🇩🇪",name:"Almanya",locale:"de-DE"}
};

const catalogById = new Map(catalog.map(item => [item.id, item]));
const state = {
  current: catalog[0],
  region: localStorage.getItem("seyir-region") || "TR",
  watched: new Set(JSON.parse(localStorage.getItem("seyir-watched") || "[]")),
  saved: new Set(JSON.parse(localStorage.getItem("seyir-saved") || "[]")),
  mood: localStorage.getItem("seyir-mood") || "dark",
  catalogReady: false,
  searchSequence: 0
};

function persist() {
  localStorage.setItem("seyir-watched", JSON.stringify([...state.watched]));
  localStorage.setItem("seyir-saved", JSON.stringify([...state.saved]));
  localStorage.setItem("seyir-region", state.region);
  localStorage.setItem("seyir-mood", state.mood);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function addToCatalog(items) {
  for (const item of items) {
    if (catalogById.has(item.id)) continue;
    catalogById.set(item.id, item);
    catalog.push(item);
  }
}

function renderOffers() {
  const region = regions[state.region];
  $("#regionFlag").textContent = region.flag;
  $("#regionName").textContent = region.name;

  const mediaPath = state.current.type === "Dizi" ? "tv" : "movie";
  const tmdbUrl = state.current.tmdbId
    ? `https://www.themoviedb.org/${mediaPath}/${state.current.tmdbId}/watch?locale=${region.locale}`
    : `https://www.themoviedb.org/search?query=${encodeURIComponent(state.current.title)}`;
  $("#availabilityTitle").textContent = `${region.name} için platformları kontrol et`;
  $("#availabilityUpdated").textContent = "Çevrimiçi kaynağa yönlendirir";
  $("#offers").innerHTML = `<a class="provider-lookup" href="${tmdbUrl}" target="_blank" rel="noopener"><span class="provider-lookup-icon">↗</span><span><strong>TMDB'de yayın seçeneklerini aç</strong><small>${escapeHtml(state.current.title)} • ${escapeHtml(region.name)}</small></span></a>`;
  $("#bestNote").hidden = true;
  $("#dataNote").textContent = "Canlı sağlayıcı ve fiyat verileri henüz API üzerinden alınmıyor; yanlış bilgi göstermek yerine kaynağa yönlendiriyoruz.";
}

function savedItems() {
  return [...state.saved].map(id => catalogById.get(id)).filter(Boolean);
}

function renderRecommendations() {
  const candidates = catalog
    .filter(item => item.id !== state.current.id && !state.watched.has(item.id) && item.poster)
    .map(item => ({ item, score: recommendationScore(state.current, item, state.mood, savedItems()) }))
    .sort((a, b) => b.score - a.score || Number(b.item.year || 0) - Number(a.item.year || 0))
    .slice(0, 5);

  $("#recommendationGrid").innerHTML = candidates.map(({ item, score }) => {
    const commonGenre = item.genres.find(genre => state.current.genres.map(normalizeText).includes(normalizeText(genre))) || item.genres[0] || "benzer tema";
    const match = Math.min(97, 58 + Math.max(0, Math.round(score / 3)));
    return `<button class="recommendation-card" data-id="${escapeHtml(item.id)}" type="button"><img src="${escapeHtml(item.poster)}" alt="${escapeHtml(item.title)} posteri" loading="lazy"/><span class="recommendation-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.year)} • ${escapeHtml(item.type)}</small><span class="why">%${match} · ${moodLabels[state.mood]} · ${escapeHtml(commonGenre)}</span></span></button>`;
  }).join("");
  $("#recommendationGrid").querySelectorAll("button").forEach(button => button.addEventListener("click", () => selectTitle(button.dataset.id)));
  $(".section-heading h3").textContent = `${state.current.title} hoşuna gittiyse`;
}

function renderActions() {
  const watched = state.watched.has(state.current.id);
  const saved = state.saved.has(state.current.id);
  $("#watchedButton").classList.toggle("selected", watched);
  $("#watchedButton").innerHTML = watched ? "<span>✓</span> İzlendi" : "<span>✓</span> İzledim";
  $("#saveButton").classList.toggle("selected", saved);
  $("#saveButton").innerHTML = saved ? "<span>✓</span> Listemde" : "<span>＋</span> Listeme ekle";
  $("#watchlistCount").textContent = state.saved.size;
}

function selectTitle(id) {
  const item = catalogById.get(id);
  if (!item) return;
  state.current = item;
  const poster = $("#poster");
  poster.classList.add("swap");
  setTimeout(() => {
    poster.src = item.poster || asset("og.png");
    poster.alt = `${item.title} posteri`;
    poster.classList.remove("swap");
  }, 160);
  $("#detailBackdrop").style.backgroundImage = `url('${item.poster || asset("og.png")}')`;
  $("#meta").innerHTML = `${escapeHtml(item.type.toUpperCase())} <span>•</span> ${escapeHtml(item.year)} <span>•</span> ${escapeHtml(String(item.extra).toUpperCase())} <span>•</span> ${escapeHtml(item.certificate)}`;
  $("#title").textContent = item.title;
  $("#tagline").textContent = item.tagline;
  $("#summary").textContent = item.summary;
  $("#genres").innerHTML = item.genres.map(genre => `<span>${escapeHtml(genre)}</span>`).join("");
  $("#imdbRating").textContent = item.imdb;
  $(".imdb small").textContent = item.imdbNote;
  $("#rtCritic").textContent = item.rtCritic;
  $("#rtAudience").textContent = item.rtAudience;
  $("#matchBadge").textContent = item.match ? `%${item.match} eşleşme` : "Katalog sonucu";
  $("#trailerButton").href = item.trailer;
  $("#searchInput").value = item.title;
  $("#searchResults").hidden = true;
  renderActions();
  renderOffers();
  renderRecommendations();
  if (id !== "lanterns") document.querySelector(".detail-card").scrollIntoView({ behavior: "smooth", block: "center" });
}

function findLocalResults(query) {
  const normalized = normalizeText(query.trim());
  if (!normalized) return [];
  return catalog
    .filter(item => normalizeText(item.title).includes(normalized))
    .sort((a, b) => {
      const aTitle = normalizeText(a.title), bTitle = normalizeText(b.title);
      return Number(bTitle === normalized) - Number(aTitle === normalized)
        || Number(bTitle.startsWith(normalized)) - Number(aTitle.startsWith(normalized))
        || Number(b.year || 0) - Number(a.year || 0);
    })
    .slice(0, 8);
}

function renderSearchResults(results, message = "") {
  const box = $("#searchResults");
  if (!results.length && !message) {
    box.hidden = true;
    return;
  }
  box.innerHTML = results.map(item => `<button class="search-result" data-id="${escapeHtml(item.id)}" type="button"><img src="${escapeHtml(item.poster || asset("og.png"))}" alt=""/><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.type)} • ${escapeHtml(item.year)} • ${item.source === "wikidata" ? "Çevrimiçi" : "Seyir kataloğu"}</small></span></button>`).join("") + (message ? `<div class="search-state">${escapeHtml(message)}</div>` : "");
  box.hidden = false;
  box.querySelectorAll("button").forEach(button => button.addEventListener("click", () => selectTitle(button.dataset.id)));
}

function renderSearch(query) {
  const trimmed = query.trim();
  const localResults = findLocalResults(trimmed);
  const sequence = ++state.searchSequence;
  clearTimeout(renderSearch.timer);
  if (!trimmed) {
    renderSearchResults([]);
    return;
  }
  renderSearchResults(localResults, !state.catalogReady ? "Film kataloğu yükleniyor…" : (localResults.length < 5 && trimmed.length >= 3 ? "Çevrimiçi sonuçlar aranıyor…" : ""));
  if (trimmed.length < 3 || localResults.length >= 5) return;

  renderSearch.timer = setTimeout(async () => {
    try {
      const online = await searchWikidata(trimmed);
      if (sequence !== state.searchSequence) return;
      addToCatalog(online);
      const merged = [...localResults, ...online.filter(item => !localResults.some(local => normalizeText(local.title) === normalizeText(item.title)))].slice(0, 8);
      renderSearchResults(merged, merged.length ? "" : "Sonuç bulunamadı.");
    } catch (error) {
      if (sequence === state.searchSequence) renderSearchResults(localResults, localResults.length ? "" : error.message);
    }
  }, 420);
}

$("#searchInput").addEventListener("input", event => renderSearch(event.target.value));
$("#searchInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    const first = $("#searchResults button");
    if (first) selectTitle(first.dataset.id);
  }
  if (event.key === "Escape") $("#searchResults").hidden = true;
});
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("#searchInput").focus();
    $("#searchInput").select();
  }
});
document.addEventListener("click", event => {
  if (!event.target.closest(".search-wrap")) $("#searchResults").hidden = true;
  if (!event.target.closest(".region-picker")) {
    $("#regionMenu").hidden = true;
    $("#regionButton").setAttribute("aria-expanded", "false");
  }
});

$("#regionButton").addEventListener("click", () => {
  const menu = $("#regionMenu");
  menu.hidden = !menu.hidden;
  $("#regionButton").setAttribute("aria-expanded", String(!menu.hidden));
});
$("#regionMenu").querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
  state.region = button.dataset.region;
  persist();
  renderOffers();
  $("#regionMenu").hidden = true;
  showToast(`${regions[state.region].name} bölgesine geçildi`);
}));
$(".quick-tags").querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
  $("#searchInput").value = button.dataset.query;
  renderSearch(button.dataset.query);
}));

$("#watchedButton").addEventListener("click", () => {
  const id = state.current.id;
  state.watched.has(id) ? state.watched.delete(id) : state.watched.add(id);
  persist();
  renderActions();
  renderRecommendations();
  showToast(state.watched.has(id) ? "İzlendi olarak işaretlendi; önerilerden çıkarılacak" : "İzlendi işareti kaldırıldı");
});
$("#saveButton").addEventListener("click", () => {
  const id = state.current.id;
  state.saved.has(id) ? state.saved.delete(id) : state.saved.add(id);
  persist();
  renderActions();
  renderRecommendations();
  showToast(state.saved.has(id) ? "Listene eklendi; zevk profiline işlendi" : "Listenden çıkarıldı");
});
$("#alertButton").addEventListener("click", event => {
  event.currentTarget.classList.toggle("active");
  showToast(event.currentTarget.classList.contains("active") ? "Fiyat alarmı kuruldu" : "Fiyat alarmı kapatıldı");
});
$("#watchlistNav").addEventListener("click", () => showToast(state.saved.size ? `Listende ${state.saved.size} içerik var` : "Listen henüz boş"));

$("#moodButton").addEventListener("click", () => { $("#moodBar").hidden = !$("#moodBar").hidden; });
$("#moodBar").querySelectorAll("button").forEach(button => {
  button.classList.toggle("active", button.dataset.mood === state.mood);
  button.addEventListener("click", () => {
    state.mood = button.dataset.mood;
    persist();
    $("#moodBar").querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
    renderRecommendations();
    showToast(`Öneriler ${moodLabels[state.mood].toLocaleLowerCase("tr-TR")} duyguya göre yenilendi`);
  });
});

$("#detailBackdrop").style.backgroundImage = `url('${state.current.poster}')`;
selectTitle(state.current.id);

(async function initializeCatalog() {
  try {
    $("#catalogStatus").textContent = "10.000 filmlik katalog yükleniyor…";
    const movies = await loadMovieCatalog(import.meta.env.BASE_URL);
    const featuredTitles = new Set(catalog.map(item => `${normalizeText(item.title)}-${item.year}`));
    addToCatalog(movies.filter(item => !featuredTitles.has(`${normalizeText(item.title)}-${item.year}`)));
    state.catalogReady = true;
    $("#catalogStatus").textContent = `${catalog.length.toLocaleString("tr-TR")} film ve dizi aramaya hazır • çevrimiçi arama açık`;
    renderRecommendations();
    if ($("#searchInput").value.trim() && $("#searchInput").value !== state.current.title) renderSearch($("#searchInput").value);
  } catch (error) {
    $("#catalogStatus").textContent = "Geniş katalog yüklenemedi; çevrimiçi arama kullanılacak.";
  }
})();
