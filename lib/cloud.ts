import { defaultGenetics } from "./genetics";
import { t } from "./i18n";
import { createSupabaseBrowser } from "./supabase/client";
import type {
  Creature,
  Friendship,
  Notice,
  NoticeKind,
  Pair,
  Poke,
  SpeciesId,
  UserProfile,
} from "./types";

export type CloudProfile = Pick<UserProfile, "id" | "username" | "email">;

function sb() {
  return createSupabaseBrowser();
}

export function cloudEnabled() {
  return Boolean(sb());
}

export async function cloudSignUp(input: {
  username: string;
  email: string;
  password: string;
  timezone: string;
}): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const client = sb();
  if (!client) return { ok: false, error: t("auth.errorGeneric") };
  const { data, error } = await client.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { username: input.username.trim() } },
  });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  if (!data.user) return { ok: false, error: t("auth.errorGeneric") };
  if (!data.session) return { ok: false, error: t("auth.confirmEmail") };
  const { error: profileError } = await client.from("profiles").upsert({
    id: data.user.id,
    username: input.username.trim(),
    email: input.email.trim().toLowerCase(),
    timezone: input.timezone,
  });
  if (profileError) return { ok: false, error: t("auth.errorTaken") };
  return { ok: true, userId: data.user.id };
}

export async function cloudSignIn(
  identifier: string,
  password: string,
): Promise<{ ok: true; userId: string; username: string; email: string; onboarded: boolean } | { ok: false; error: string }> {
  const client = sb();
  if (!client) return { ok: false, error: t("auth.errorGeneric") };
  const { data: email, error: lookupError } = await client.rpc("email_for_login", {
    p_id: identifier.trim(),
  });
  if (lookupError) return { ok: false, error: t("community.cloudSetup") };
  const resolved = (email as string | null) ?? (identifier.includes("@") ? identifier.trim() : "");
  if (!resolved) return { ok: false, error: t("auth.errorCreds") };
  const { data, error } = await client.auth.signInWithPassword({
    email: resolved,
    password,
  });
  if (error || !data.user) return { ok: false, error: t("auth.errorCreds") };
  const { data: profile } = await client
    .from("profiles")
    .select("id, username, email, onboarded")
    .eq("id", data.user.id)
    .maybeSingle();
  return {
    ok: true,
    userId: data.user.id,
    username: profile?.username ?? data.user.user_metadata?.username ?? identifier.trim(),
    email: profile?.email ?? data.user.email ?? resolved,
    onboarded: Boolean(profile?.onboarded),
  };
}

export async function cloudSignOut() {
  await sb()?.auth.signOut();
}

export async function cloudSession() {
  const client = sb();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const { data: profile } = await client
    .from("profiles")
    .select("id, username, email, timezone, onboarded")
    .eq("id", user.id)
    .maybeSingle();
  return {
    userId: user.id,
    username: profile?.username ?? (user.user_metadata?.username as string) ?? "",
    email: profile?.email ?? user.email ?? "",
    timezone: profile?.timezone ?? "Europe/Istanbul",
    onboarded: Boolean(profile?.onboarded),
  };
}

export async function cloudLookupFriend(username: string) {
  const client = sb();
  if (!client) return null;
  const { data, error } = await client.rpc("lookup_friend", { p_username: username });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) return null;
  return { id: row.id as string, username: row.username as string };
}

export async function cloudInsertFriendship(fromId: string, toId: string, fromUsername: string) {
  const client = sb();
  if (!client) return { ok: false, error: t("auth.errorGeneric") };
  const { error } = await client.from("friendships").insert({
    user_a: fromId,
    user_b: toId,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: t("community.already") };
    if (error.code === "23503") return { ok: false, error: t("community.needCloudAccount") };
    return { ok: false, error: t("community.cloudSetup") };
  }
  await client.from("notices").insert({
    user_id: toId,
    kind: "bond",
    title: t("toast.friendIn"),
    body: fromUsername,
    href: "/topluluk",
  });
  return { ok: true };
}

export async function cloudAcceptFriendship(id: string) {
  const client = sb();
  if (!client) return;
  await client.from("friendships").update({ status: "accepted" }).eq("id", id);
}

export async function cloudInsertPoke(fromUser: string, toUser: string, date: string, fromUsername: string) {
  const client = sb();
  if (!client) return { ok: false };
  const { error } = await client.from("pokes").insert({
    from_user: fromUser,
    to_user: toUser,
    date,
  });
  if (error) return { ok: false, error: t("community.pokeLimit") };
  await client.from("notices").insert({
    user_id: toUser,
    kind: "poke",
    title: t("toast.pokedYou", { name: fromUsername }),
    body: t("toast.pokedYou", { name: fromUsername }),
    href: "/anasayfa",
  });
  return { ok: true };
}

export async function cloudInsertPair(pair: Pair) {
  const client = sb();
  if (!client) return;
  await client.from("pairs").insert({
    id: pair.id,
    user_a: pair.userA,
    user_b: pair.userB,
    creature_a_id: pair.creatureAId,
    creature_b_id: pair.creatureBId,
    status: pair.status,
    sync_points: pair.syncPoints,
    bonded_at: pair.bondedAt,
    married_at: pair.marriedAt,
  });
}

export async function cloudMarkNoticesRead(userId: string) {
  const client = sb();
  if (!client) return;
  await client.from("notices").update({ read: true }).eq("user_id", userId).eq("read", false);
}

export async function cloudSetOnboarded(userId: string) {
  const client = sb();
  if (!client) return;
  await client.from("profiles").update({ onboarded: true }).eq("id", userId);
}

export async function cloudPublishCreature(creature: Creature) {
  const client = sb();
  if (!client) return;
  await client.from("creatures").upsert({
    id: creature.id,
    owner_id: creature.ownerId,
    name: creature.name,
    species_id: creature.speciesId,
    stage: creature.stage,
    total_gp: creature.totalGp,
    current_streak: creature.currentStreak,
    longest_streak: creature.longestStreak,
    hue_shift: creature.hueShift,
    adult_reached_at: creature.adultReachedAt,
    adult_gp_snapshot: creature.adultGpSnapshot,
    status: creature.status,
    spouse_owner_id: creature.spouseOwnerId,
    spouse_creature_name: creature.spouseCreatureName,
    married_at: creature.marriedAt,
    parent_a_id: creature.parentAId,
    parent_b_id: creature.parentBId,
    generation: creature.generation,
    genetics: creature.genetics,
    egg_shell_variant: creature.eggShellVariant,
    rare_mutation: creature.rareMutation,
    unlocked_room_items: creature.unlockedRoomItems,
  });
}

export async function cloudPullSocial(userId: string): Promise<{
  friendships: Friendship[];
  notices: Notice[];
  pokes: Poke[];
  pairs: Pair[];
  profiles: CloudProfile[];
  creatures: Creature[];
} | null> {
  const client = sb();
  if (!client) return null;
  const friendsRes = await client.from("friendships").select("*").or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (friendsRes.error) return null;
  const [noticesRes, pokesRes, pairsRes] = await Promise.all([
    client.from("notices").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    client.from("pokes").select("*").or(`from_user.eq.${userId},to_user.eq.${userId}`),
    client.from("pairs").select("*").or(`user_a.eq.${userId},user_b.eq.${userId}`),
  ]);

  const friendships: Friendship[] = (friendsRes.data ?? []).map((row) => ({
    id: row.id,
    userA: row.user_a,
    userB: row.user_b,
    status: row.status,
    createdAt: row.created_at,
  }));
  const notices: Notice[] = (noticesRes.data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    kind: row.kind as NoticeKind,
    title: row.title,
    body: row.body,
    read: row.read,
    createdAt: row.created_at,
    href: row.href ?? undefined,
  }));
  const pokes: Poke[] = (pokesRes.data ?? []).map((row) => ({
    id: row.id,
    fromUser: row.from_user,
    toUser: row.to_user,
    date: row.date,
  }));
  const pairs: Pair[] = (pairsRes.data ?? []).map((row) => ({
    id: row.id,
    userA: row.user_a,
    userB: row.user_b,
    creatureAId: row.creature_a_id,
    creatureBId: row.creature_b_id,
    status: row.status,
    syncPoints: row.sync_points,
    bondedAt: row.bonded_at,
    marriedAt: row.married_at,
  }));

  const otherIds = [
    ...new Set(
      friendships.flatMap((f) => [f.userA, f.userB]).filter((id) => id !== userId),
    ),
  ];
  let profiles: CloudProfile[] = [];
  let creatures: Creature[] = [];
  if (otherIds.length) {
    const { data: profileRows } = await client.rpc("profiles_for_ids", { p_ids: otherIds });
    profiles = (profileRows ?? []).map((row: { id: string; username: string }) => ({
      id: row.id,
      username: row.username,
      email: "",
    }));
    const { data: creatureRows } = await client
      .from("creatures")
      .select("*")
      .in("owner_id", otherIds)
      .eq("status", "active");
    creatures = (creatureRows ?? []).map(mapCreature);
  }
  return { friendships, notices, pokes, pairs, profiles, creatures };
}

function mapCreature(row: Record<string, unknown>): Creature {
  const speciesId = (row.species_id as SpeciesId) ?? "tofiby";
  const hueShift = Number(row.hue_shift ?? 0);
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    name: String(row.name ?? ""),
    speciesId,
    stage: (row.stage as Creature["stage"]) ?? "egg",
    totalGp: Number(row.total_gp ?? 0),
    currentStreak: Number(row.current_streak ?? 0),
    longestStreak: Number(row.longest_streak ?? 0),
    hueShift,
    adultReachedAt: (row.adult_reached_at as string) ?? null,
    adultGpSnapshot: row.adult_gp_snapshot == null ? null : Number(row.adult_gp_snapshot),
    hatchedAt: null,
    health: "active",
    consecutiveZeroDays: 0,
    recoveryStreak: 0,
    status: (row.status as Creature["status"]) ?? "active",
    createdAt: String(row.created_at ?? new Date().toISOString().slice(0, 10)),
    retiredAt: (row.retired_at as string) ?? null,
    spouseOwnerId: (row.spouse_owner_id as string) ?? null,
    spouseCreatureName: (row.spouse_creature_name as string) ?? null,
    marriedAt: (row.married_at as string) ?? null,
    parentAId: (row.parent_a_id as string) ?? null,
    parentBId: (row.parent_b_id as string) ?? null,
    generation: Number(row.generation ?? 1),
    genetics: (row.genetics as Creature["genetics"]) ?? defaultGenetics(speciesId, hueShift, [String(row.id)]),
    eggShellVariant: String(row.egg_shell_variant ?? ""),
    rareMutation: Boolean(row.rare_mutation),
    unlockedRoomItems: (row.unlocked_room_items as string[]) ?? [],
    letters: [],
  };
}

function mapAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("already") || m.includes("registered")) return t("auth.errorTaken");
  if (m.includes("password")) return t("auth.errorShort");
  if (m.includes("email")) return t("auth.errorCreds");
  return t("auth.errorGeneric");
}
