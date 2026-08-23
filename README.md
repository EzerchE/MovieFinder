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
- Trakt OAuth bağlantısı, geçmiş ve watchlist eşitleme istemcisi

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

GitHub Pages yalnızca statik dosya barındırır. TMDB anahtarları, Trakt OAuth
secret'ı ve diğer özel anahtarlar bu uygulamanın tarayıcı koduna eklenmemelidir.
Trakt token değişimi için `worker/` altında ayrı ve CORS kısıtlı bir Worker
uygulaması bulunur.

## Trakt bağlantısını etkinleştirme

1. Trakt'ta bir API uygulaması oluşturun.
2. Uygulamanın redirect URI alanına tam olarak
   `https://ezerche.github.io/MovieFinder/` değerini ekleyin.
3. `worker/wrangler.toml.example` dosyasını `worker/wrangler.toml` olarak
   kopyalayın ve Worker'ı Cloudflare'a dağıtın.
4. Worker üzerinde `TRAKT_CLIENT_ID` ve `TRAKT_CLIENT_SECRET` değerlerini secret
   olarak tanımlayın. Secret değerlerini depoya veya Vite ortamına koymayın.
5. GitHub repository **Settings → Secrets and variables → Actions → Variables**
   bölümüne şu değişkenleri ekleyin:

   - `TRAKT_CLIENT_ID`: Trakt uygulamasının herkese açık Client ID değeri
   - `TRAKT_AUTH_URL`: dağıtılan Worker adresi; örneğin
     `https://seyir-trakt-oauth.<hesap>.workers.dev`

6. GitHub Pages workflow'unu yeniden çalıştırın.

Bağlantı tamamlandığında erişim ve yenileme belirteçleri yalnızca kullanıcının
tarayıcısında saklanır. Worker, Trakt `client_secret` değerini tarayıcıya
göndermeden authorization code ve refresh token değişimini gerçekleştirir.

## Canlı veri katmanı

Mevcut ekran çalışan bir ürün önizlemesidir. Canlı sürümde planlanan veri akışı:

- TMDB: arama, içerik ayrıntıları, bölgesel watch provider verisi
- JustWatch partner verisi: varsa kiralama/satın alma fiyatları ve derin bağlantılar
- IMDb lisanslı veri veya OMDb: IMDb puanı
- Lisanslı Rotten Tomatoes/OMDb verisi: eleştirmen ve izleyici puanları
- Trakt OAuth: geçmiş ve watchlist içe aktarma; IMDb kimliği bulunan filmlerde
  izlendi ve film/dizi watchlist durumunu Trakt'a yazma
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
