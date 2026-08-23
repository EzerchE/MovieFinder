# Seyir

**Canlı demo:** https://ezerche.github.io/MovieFinder/

Seyir; film ve dizilerin seçilen ülke/bölgede hangi platformlarda izlenebildiğini,
puanlarını ve en uygun izleme seçeneğini tek ekranda göstermeyi hedefleyen bir
keşif ürünüdür.

Şu anda çalışan özellikler:

- Depodaki TMDB kaynaklı veriden derlenen yaklaşık 10.000 filmlik hızlı katalog
- Yerel katalogda bulunmayan film ve diziler için anahtarsız Wikidata araması
- Türkiye, ABD, Birleşik Krallık ve Almanya bölge seçimi
- Seçilen içerik ve ülke için TMDB yayın seçenekleri sayfasına yönlendirme
- İzledim ve listeme ekle durumlarının cihazda saklanması
- Türler, anahtar kelimeler, seçilen duygu ve Listem verisinden puanlanan öneriler
- İzlenen içeriklerin sonraki önerilerden çıkarılması

## Yerel geliştirme

```bash
npm install
npm run dev
```

Üretim derlemesi:

```bash
npm run build
```

Derleme öncesinde `scripts/build-catalog.mjs`, `data/movie_details.json`
dosyasını tarayıcı için küçültülmüş `public/data/catalog.json` çıktısına çevirir.
Bu çıktı üretilen dosyadır ve Git'e eklenmez.

## GitHub Pages

Proje Vite ile statik olarak derlenir ve `master` dalına yapılan her push'ta
`.github/workflows/deploy-pages.yml` üzerinden GitHub Pages'e gönderilir.
Repository Pages ayarlarında yayın kaynağı olarak **GitHub Actions** seçilmelidir.

GitHub Pages yalnızca statik dosya barındırır. TMDB ve diğer özel API anahtarları
uygulamanın tarayıcı koduna eklenmemelidir. Canlı veri entegrasyonları ileride
ayrı bir API/worker katmanında tutulmalıdır.

Trakt API uygulaması oluşturmak VIP üyeliği gerektirdiği için Trakt bağlantısı
şimdilik ürün kapsamından çıkarılmıştır. Öneriler ücretsiz olarak cihazdaki
`İzledim`, `Listem` ve duygu seçimleriyle kişiselleştirilir; izlendi olarak
işaretlenen içerikler sonraki önerilerden çıkarılır.

## Veri katmanı

Arama ve öneriler anahtar veya ücret gerektirmeden çalışır. Puanların ve platform
kartlarının otomatik güncellenmesi için planlanan sonraki veri akışı:

- TMDB: arama, içerik ayrıntıları, bölgesel watch provider verisi
- JustWatch partner verisi: varsa kiralama/satın alma fiyatları ve derin bağlantılar
- IMDb lisanslı veri veya OMDb: IMDb puanı
- Lisanslı Rotten Tomatoes/OMDb verisi: eleştirmen ve izleyici puanları
- Üyelik gerektirmeyen yerel profil: izlendi, listem ve öneri tercihleri
- Ayrı ve kaynak tarihi tutulan platform paket fiyatı kataloğu

Gerekli anahtar isimleri `.env.example` içinde yer alır. Anahtarlar istemci
tarafına konulmamalı; sunucu/worker katmanında tutulmalıdır.

## Önceki benzerlik haritası

Depodaki ilk MovieFinder deneyimi `legacy.html`, `script.js`, `style.css` ve
`data/` altında korunmuştur. Python veri üretim dosyaları da ileride “Duygu
Haritası” görünümüne dönüştürülmek üzere yerinde bırakılmıştır.

Bu ürün TMDB API'sini kullanmak üzere tasarlanmıştır ancak TMDB tarafından
onaylanmış veya sertifikalandırılmış değildir. TMDB üzerinden sunulan izleme
sağlayıcısı verileri kullanıldığında JustWatch atfı zorunludur.
