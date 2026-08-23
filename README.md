# Seyir

**Canlı demo:** https://ezerche.github.io/MovieFinder/

Seyir; film ve dizilerin seçilen ülke/bölgede hangi platformlarda izlenebildiğini,
puanlarını ve en uygun izleme seçeneğini tek ekranda göstermeyi hedefleyen bir
keşif ürünüdür.

İlk ürün diliminde şunlar çalışır:

- Film/dizi arama ve örnek içerikler arasında geçiş
- Türkiye, ABD, Birleşik Krallık ve Almanya bölge seçimi
- Abonelik seçenekleri ile platform fiyat karşılaştırma yüzeyi
- IMDb, Rotten Tomatoes eleştirmen ve izleyici puan alanları
- İzledim ve listeme ekle durumlarının cihazda saklanması
- Duygu etiketleriyle benzer içerik önerileri
- İzledim ve Listem verilerine göre önerileri cihaz üzerinde kişiselleştirme

## Yerel geliştirme

```bash
npm install
npm run dev
```

Üretim derlemesi:

```bash
npm run build
```

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

## Canlı veri katmanı

Mevcut ekran çalışan bir ürün önizlemesidir. Canlı sürümde planlanan veri akışı:

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
