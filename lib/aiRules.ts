import { GAME_CONFIG, GP_STAGE_THRESHOLDS, STAGE_ORDER } from "./gameConfig";

/** Compact, source-of-truth rules for the companion chat. Do not invent extras. */
export function gameRulesForAi(): string {
  return [
    "Büyüme kuralları — SADECE bunları kullan, yeni mekanik uydurma:",
    `- Seri günü (DCS eşiği): planlanan görev ağırlığının en az ${GAME_CONFIG.DCS_STREAK_THRESHOLD} kadarı tamamlanmalı.`,
    `- Tutarlılık çarpanı: CM(S) = 1 + ${GAME_CONFIG.CONSISTENCY_K} × ln(S+1). S = bugünden sonraki seri.`,
    `- Günlük GP: ${GAME_CONFIG.BASE_POINTS_PER_DAY} × CM(S) × DCS. DCS yoksa (dinlenme günü) GP = 0.`,
    `- Yumurta açılması GP kapısı değil: ilk seri gününde (${GAME_CONFIG.HATCH_TRIGGER}) bebek olur.`,
    `- Evrim eşikleri (bebek sonrası, birikmiş GP): çocuk ${GP_STAGE_THRESHOLDS.child}, genç ${GP_STAGE_THRESHOLDS.teen}, yetişkin ${GP_STAGE_THRESHOLDS.adult}, yaşlı ${GP_STAGE_THRESHOLDS.elder}.`,
    `- Evre sırası: ${STAGE_ORDER.join(" → ")}.`,
    `- Hasta: ${GAME_CONFIG.SICK_TRIGGER_ZERO_DAYS} ardışık sıfır gün. İyileşme: ${GAME_CONFIG.SICK_RECOVERY_STREAK_DAYS} gün üst üste DCS ≥ ${GAME_CONFIG.SICK_RECOVERY_DCS_THRESHOLD}. Hasta iken GP donar, birikmiş GP silinmez.`,
    `- Birlik/evlilik barı: yetişkin olduktan ${GAME_CONFIG.UNION_MIN_DAYS_POST_ADULT} gün ve +${GAME_CONFIG.UNION_GP_POST_ADULT} GP.`,
    `- Görev ufku: ${GAME_CONFIG.TASK_HORIZON_DAYS} gün. Haftada en fazla ${GAME_CONFIG.MAX_REST_DAYS_PER_WEEK} dinlenme günü.`,
    "Hedef BELİRLEME. Var olan hedefi boşluklara yay. Sayıları kullanıcının güncel verisinden al.",
  ].join("\n");
}

export const APP_ROUTES = [
  { href: "/anasayfa", label: "Bugün", hint: "bugünün görevleri, seri, hızlı ekleme" },
  { href: "/gorevler", label: "Görevler", hint: "tüm görev listesi" },
  { href: "/takvim", label: "Takvim", hint: "haftalık takvim, ders programı, saat dağıtma" },
  { href: "/hedeflerim", label: "Hedefler", hint: "hedef oluştur/düzenle, kilometre taşları" },
  { href: "/analiz", label: "Analiz", hint: "ısı haritası, tutarlılık, rapor" },
  { href: "/yaratigim", label: "Dostun", hint: "büyüme, evre, oda, evrim geçmişi" },
  { href: "/topluluk", label: "Bağ", hint: "arkadaş, dürtme, birlikte görev" },
  { href: "/nesil", label: "Nesil", hint: "aile ağacı" },
  { href: "/profil", label: "Profil", hint: "hesap özeti" },
  { href: "/ayarlar", label: "Ayarlar", hint: "tema, dinlenme günü, AI onayı, veri silme" },
] as const;

export function routeMapForAi(): string {
  return [
    "Uygulama sayfaları — yönlendirme için SADECE bu href değerlerini kullan:",
    ...APP_ROUTES.map((r) => `- ${r.href} — ${r.label}: ${r.hint}`),
    "Kullanıcı bir yeri sorarsa links dizisine tıklanabilir Git hedefi koy (label + href).",
  ].join("\n");
}
