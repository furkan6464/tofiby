"use client";

import { useEffect, useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import { GAME_CONFIG } from "@/lib/gameConfig";
import { todayKey } from "@/lib/dates";
import { isUnionReady } from "@/lib/growthEngine";
import { stageLabel, useApp, useSession } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Progress } from "@/components/ui/Progress";

export default function CommunityPage() {
  const user = useSession();
  const users = useApp((s) => s.users);
  const friendships = useApp((s) => s.friendships);
  const creatures = useApp((s) => s.creatures);
  const pairs = useApp((s) => s.pairs);
  const pokes = useApp((s) => s.pokes);
  const notices = useApp((s) => s.notices);
  const addFriend = useApp((s) => s.addFriend);
  const accept = useApp((s) => s.acceptFriend);
  const poke = useApp((s) => s.poke);
  const bond = useApp((s) => s.bond);
  const markRead = useApp((s) => s.markNoticesRead);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("ekle");
    if (q) setName(q);
  }, []);

  const invite = useMemo(() => {
    if (!user || typeof window === "undefined") return "";
    return `${window.location.origin}/topluluk?ekle=${user.username}`;
  }, [user]);

  if (!user) return null;
  const today = todayKey(user.timezone);
  const mine = friendships.filter((f) => f.userA === user.id || f.userB === user.id);
  const pending = mine.filter((f) => f.status === "pending" && f.userB === user.id);
  const outgoing = mine.filter((f) => f.status === "pending" && f.userA === user.id);
  const friends = mine.filter((f) => f.status === "accepted");
  const myNotices = notices.filter((n) => n.userId === user.id).slice(-8).reverse();
  const myCreature = creatures.find((c) => c.ownerId === user.id && c.status === "active");

  return (
    <main className="safe-pad mx-auto max-w-3xl px-5 py-8">
      <h1 className="font-display text-4xl">{t("community.title")}</h1>
      <p className="mt-2 text-sm text-faint">{t("community.privacy")}</p>

      <Card className="mt-6 p-5">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await addFriend(name);
            if (res.ok) {
              setName("");
              setError(t("community.sent"));
            } else {
              setError(res.error ?? "");
            }
          }}
        >
          <div className="flex-1">
            <Field
              label={t("community.usernameOrLink")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button className="sm:mt-7" type="submit">
            {t("community.addFriend")}
          </Button>
        </form>
        {error ? (
          <p className={`mt-2 text-sm ${error === t("community.sent") ? "text-mint" : "text-pink"}`}>
            {error}
          </p>
        ) : null}
        <button
          className="mt-3 text-sm text-violet"
          onClick={() => {
            navigator.clipboard.writeText(invite);
            setCopied(true);
          }}
        >
          {copied ? t("community.copied") : t("community.invite")}
        </button>
      </Card>

      {outgoing.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-xl">{t("community.outgoing")}</h2>
          <div className="mt-3 space-y-2">
            {outgoing.map((f) => {
              const other = users.find((u) => u.id === f.userB);
              return (
                <Card key={f.id} className="flex items-center justify-between p-4">
                  <span>@{other?.username}</span>
                  <span className="text-xs text-faint">{t("community.waiting")}</span>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {pending.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-xl">{t("community.pending")}</h2>
          <div className="mt-3 space-y-2">
            {pending.map((f) => {
              const other = users.find((u) => u.id === f.userA);
              return (
                <Card key={f.id} className="flex items-center justify-between p-4">
                  <span>@{other?.username}</span>
                  <Button onClick={() => accept(f.id)}>{t("community.accept")}</Button>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-xl">{t("community.friends")}</h2>
        {friends.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("community.empty")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {friends.map((f) => {
              const otherId = f.userA === user.id ? f.userB : f.userA;
              const other = users.find((u) => u.id === otherId);
              const creature = creatures.find((c) => c.ownerId === otherId && c.status === "active");
              const pair = pairs.find(
                (p) =>
                  (p.userA === user.id && p.userB === otherId) ||
                  (p.userB === user.id && p.userA === otherId),
              );
              const poked = pokes.some(
                (p) => p.fromUser === user.id && p.toUser === otherId && p.date === today,
              );
              const canBond =
                myCreature &&
                creature &&
                isUnionReady(
                  myCreature.adultReachedAt,
                  myCreature.adultGpSnapshot,
                  myCreature.totalGp,
                  today,
                  myCreature.stage,
                ) &&
                isUnionReady(
                  creature.adultReachedAt,
                  creature.adultGpSnapshot,
                  creature.totalGp,
                  today,
                  creature.stage,
                );
              return (
                <Card key={f.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-lg">@{other?.username}</p>
                      <p className="text-xs text-muted">
                        {creature ? stageLabel(creature.stage) : "—"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <TogetherAsk friendId={otherId} />
                      {pair?.status === "bonded" ? (
                        <Button
                          tone="ghost"
                          disabled={poked}
                          onClick={() => poke(otherId)}
                        >
                          {poked ? t("community.poked") : t("community.poke")}
                        </Button>
                      ) : null}
                      {!pair && canBond ? (
                        <Button tone="violet" onClick={() => bond(otherId)}>
                          {t("community.bond")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {pair ? (
                    <div className="mt-3">
                      <p className="text-xs text-faint">
                        {pair.status === "married"
                          ? t("community.married")
                          : t("community.sync", {
                              n: pair.syncPoints,
                              max: GAME_CONFIG.SYNC_POINTS_MARRIAGE_THRESHOLD,
                            })}
                      </p>
                      {pair.status === "bonded" ? (
                        <div className="mt-2">
                          <Progress
                            value={
                              (pair.syncPoints / GAME_CONFIG.SYNC_POINTS_MARRIAGE_THRESHOLD) * 100
                            }
                            tone="violet"
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">{t("community.notices")}</h2>
          <button className="text-xs text-violet" onClick={markRead}>
            {t("common.done")}
          </button>
        </div>
        {myNotices.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("community.noticeEmpty")}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {myNotices.map((n) => (
              <Card key={n.id} className={`p-3 text-sm ${n.read ? "text-faint" : ""}`}>
                {n.title}
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function TogetherAsk({ friendId }: { friendId: string }) {
  const propose = useApp((s) => s.proposeTogether);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  return (
    <>
      <Button tone="ghost" onClick={() => setOpen((v) => !v)}>
        {t("together.ask")}
      </Button>
      {open ? (
        <form
          className="absolute mt-12 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            propose(friendId, title);
            setTitle("");
            setOpen(false);
          }}
        >
          <input
            className="w-40 px-2 py-1 text-sm"
            placeholder={t("together.placeholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button type="submit">{t("common.add")}</Button>
        </form>
      ) : null}
    </>
  );
}
