# Tofiby

Günlük hedeflerini tut, serini koru, köşedeki minik dostunu büyüt.

Tofiby bir yapılacaklar listesi değil. Tutarlılıkla evrilen bir yoldaş: yumurtadan yaşlılığa, hastalık ve iyileşmeden takvim ritmine kadar tek bir uygulamada.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + Framer Motion
- **Zustand** (localStorage persist)
- Piksel sprite motoru (`data/creatures`)
- Büyüme matematiği (`lib/growthEngine.ts`)

Şu an canlı veri katmanı tarayıcıda. Supabase şeması `supabase/` altında hazır, henüz zorunlu değil.

## Klasör yapısı

```
app/                 Sayfalar ve rotalar (App Router)
  anasayfa/          Dashboard, seri, yıllık aktivite haritası
  onboarding/        İsim → yumurta → mekanik slaytları → hedefler
  takvim/            Ay / hafta / gün / liste
  yaratigim/         Dostunun sahne sayfası
  hedeflerim/        Hedef yönetimi
  topluluk/          Arkadaşlık ve bağ
components/
  creature/          Sprite, widget, kuluçka töreni
  home/              Yıllık ısı haritası
  tasks/             Görev satırı
  layout/            Nav, providers
  ui/                Buton, kart, modal
data/creatures/      Tür paletleri ve piksel kareleri
lib/                 Store, büyüme motoru, tarihler, i18n
locales/             Türkçe metinler
public/              PWA ikonları
supabase/            SQL şema + midnight-tick fonksiyonu
```

## Geliştirme

```bash
npm install
cp .env.example .env.local   # isteğe bağlı, Supabase için
npm run dev
```

[http://localhost:3000](http://localhost:3000)

| Komut        | Ne yapar                          |
| ------------ | --------------------------------- |
| `npm run dev`  | Geliştirme sunucusu             |
| `npm test`     | Büyüme ve genetik birim testleri |
| `npm run build`| Üretim derlemesi                |
| `npm run lint` | ESLint                          |

## Oyun kuralları (kısa)

- Bir gün **seri günü** sayılır: o günün görev tamamlanma oranı ≥ **0.8**
- **Kuluçka:** ilk seri gününde yumurta kırılır (GP eşiği yok)
- **Büyüme:** GP, seri uzunluğuyla çarpanlanır; kopan seri geçmişi silmez, hızı yavaşlatır
- **Hastalık:** 7 ardışık sıfır-aktivite günü → GP donar; 3 ardışık gün DCS ≥ 0.6 ile iyileşir
- **Yetişkinlik sonrası bağ:** gerçek zaman + GP kapısı; evlilik acele ettirilemez

## Lisans

Özel proje — [Furkan Közkaya](https://github.com/furkan6464).
