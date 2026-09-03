# Tofiby Creature Style Guide

Tek doğruluk kaynağı. Mekanik, veri modeli ve evrim akışına dokunulmaz. Sadece görsel asset kalıbı.

## 1. Teknik envanter

Yaratıklar PNG sprite sheet değil. Motor `data/creatures/` altındaki **32×32** kareleri okur ve canvas’a nearest-neighbor çizer.

| Parça | Yol | Not |
| --- | --- | --- |
| Izgara | `types.ts` `GRID = 32` | Tüm evreler aynı canvas |
| Palet | `palettes.ts` | Tür başına 13 anahtar |
| Ressam | `draw.ts` | oturan chibi: elips + iki ayrı göz + kontur |
| Kareler | `{tofiby,bulut,yildiz,gizem,isilti}.ts` | baby / child / teen / adult / elder |
| Yumurta | `egg.ts` | Tür başına kabuk + çatlak |
| Anim | `anims.ts` `makeAnims` | idle/blink/bounce tek kareden türetilir |
| Çizim | `PixelSprite.tsx` | şeffaf, `image-rendering: pixelated` |

**Karakter haritası** (`parse.ts`): `.` boş · `B` body · `S` shade · `C` belly · `E` eye · `W` highlight · `H` blush · `O` outline · `A` accent · `K` shell · `D` shellShade · `P` speckle · `L` lid

ASCII hâlâ çalışır (genetics / FX overlay). Yeni gövde kareleri `draw.ts` ile boyanır.

**Türler:** tofiby (starter) · bulut (starter) · yildiz (starter) · gizem (starter) · isilti (legendary mutation)

**Aile teması:** tatlı + hava + rüya — reçel damlası, sis mantısı, çiy feneri, bal mantısı, mücevher şeftali.

## 2. Oturan chibi kalıbı

Referans kalite: büyük kafa, küçük gövde, iki ayrı parlak göz, yumuşak gölge, 1px kontur, minik ayaklar. **Kopya yok** — tilki / dino / fok / aslan / köpek / kertenkele yok.

Her yaratıkta:

1. Karnında yumuşak açık `C` (belly).
2. Tek kişilik rengi `A`.
3. Kontur `O` saf siyah değil, gövdenin koyu hali. Gözler kontur kaynağı değildir (vizör köprüsü olmasın).
4. İki ayrı yuvarlak göz: `E` + sol-üst `W`. Gözler asla yatay çubuk olmaz.
5. Tam oturuş: kafa + gövde + kulak/kuyruk veya özgün siluet + minik ayak.

Işık her zaman **sol-üst**.

## 3. Aşama oranları

- **Yumurta:** kabuk, türün `P` rengiyle ipucu.
- **Bebek:** kafa ~%60–70, güdük uzuvlar, gözler yüzün büyük kısmı.
- **Çocuk / Genç:** oranlar uzar, küçük `A` aksesuar.
- **Yetişkin / Yaşlı:** tanınır oturuş. Yaşlıda ekstra `A` ışıltı.

## 4. Yasaklar

Nurrow / Pokémon / Neopets / Axie / Tamagotchi / referans pet kartları kopyası yok. Ateş-su-çim yok. Donuk+koyu siluet yok. Teal vizör / Among Us göz çubuğu yok.

## 5. 2026 yeniden tasarım

| Tür | Konsept | Taban | Aksan | Göz |
| --- | --- | --- | --- | --- |
| tofiby | reçel damlası / kalp yanak / kayısı kulak | şeker pembesi | kayısı | koyu erik |
| bulut | sis mantısı, dalgalı etek | lila-pamuk | limon | gece mavisi |
| yildiz | çiy feneri / armut | nane | altın | orman |
| gizem | bal mantısı, iki yuvarlak göz | bal / kayısı | teal filiz | koyu erik |
| isilti | mücevher şeftali | şeftali altın | elmas | koyu kakao |
