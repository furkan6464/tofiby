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

export function coachingRulesForAi(): string {
  return [
    "Koçluk — HER tavsiye snapshot'taki gerçek sayılara ve memory listesine dayansın.",
    "Boş motivasyon yok. Somut ol: seri, GP, aşama, hedef pct, dcs7.",
    "memory yalnızca kullanıcının söylediği veya veriden net gözlenen gerçeklerdir. Yeni varsayım uydurma.",
    "Ton sıcak ve teşvik edici. Suçlama yok. Seri kırıldıysa: geçmiş silinmedi, hız yavaşladı.",
    "snapshot'ta olmayan sayı/saat/alışkanlık uydurma.",
    "Cevabında createGoal, createTask gibi iç adlar ASLA geçmesin.",
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
    "Kullanıcı bir yeri sorarsa navigateTo çağır veya links dizisine href koy. Metne [hedeflerim](/hedeflerim) yazma.",
    "Yapamadığın her eylemde mutlaka navigateTo çağır; düz metinde sayfa adı veya araç adı bırakma.",
  ].join("\n");
}

export const BLOCKED_PAGE: Record<string, { href: string; label: string }> = {
  addFriend: { href: "/topluluk", label: "Bağ" },
  acceptFriend: { href: "/topluluk", label: "Bağ" },
  poke: { href: "/topluluk", label: "Bağ" },
  bond: { href: "/topluluk", label: "Bağ" },
  deleteAccount: { href: "/ayarlar", label: "Ayarlar" },
  deleteUser: { href: "/ayarlar", label: "Ayarlar" },
  pay: { href: "/ayarlar", label: "Ayarlar" },
};

export function gitLinksFromReply(reply: string): { label: string; href: string }[] {
  if (!/yapamam|yapılmıyor|yapılamaz|sohbetten|kendin|gitmen|sayfadan|ben açamam|elle |manuel|buradan olmaz/i.test(reply)) {
    return [];
  }
  const hits: { label: string; href: string }[] = [];
  const add = (href: string, label: string) => {
    if (!hits.some((x) => x.href === href)) hits.push({ label, href });
  };
  if (/arkadaş|bağ|dürt|istek/i.test(reply)) add("/topluluk", "Bağ");
  if (/ödeme|kart|abone|hesap sil|veri sil|ayar/i.test(reply)) add("/ayarlar", "Ayarlar");
  if (/hedef/i.test(reply)) add("/hedeflerim", "Hedefler");
  if (/takvim|program/i.test(reply)) add("/takvim", "Takvim");
  if (/analiz|istatistik/i.test(reply)) add("/analiz", "Analiz");
  if (hits.length === 0 && /sayfa/i.test(reply)) add("/anasayfa", "Bugün");
  return hits;
}
