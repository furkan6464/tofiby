"use client";

import { useMemo, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { initials } from "@/lib/timeBlock";
import { useApp, useSession } from "@/lib/store";

export function TogetherInvite({ taskId }: { taskId?: string }) {
  const user = useSession();
  const users = useApp((s) => s.users);
  const friendships = useApp((s) => s.friendships);
  const companions = useApp((s) => s.taskCompanions);
  const invite = useApp((s) => s.inviteCompanion);
  const cancel = useApp((s) => s.cancelCompanion);
  const toast = useApp((s) => s.pushToast);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const friends = useMemo(() => {
    if (!user) return [];
    return friendships
      .filter(
        (f) =>
          f.status === "accepted" && (f.userA === user.id || f.userB === user.id),
      )
      .map((f) => {
        const id = f.userA === user.id ? f.userB : f.userA;
        const name = users.find((u) => u.id === id)?.username ?? id.slice(0, 6);
        return { id, name };
      });
  }, [friendships, user, users]);

  const active = useMemo(
    () =>
      (companions ?? []).filter(
        (c) => c.taskId === taskId && c.status !== "declined",
      ),
    [companions, taskId],
  );

  const taken = new Set(active.flatMap((c) => [c.fromUser, c.toUser]));
  const query = q.trim().toLowerCase();
  const choices = friends.filter(
    (f) => !taken.has(f.id) && (!query || f.name.toLowerCase().includes(query)),
  );

  function pick(friendId: string) {
    if (!taskId) {
      toast(t("together.needSave"));
      setOpen(false);
      return;
    }
    const res = invite(taskId, friendId);
    if (res.error) toast(res.error);
    setOpen(false);
    setQ("");
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        {active.map((c) => {
          const otherId = c.fromUser === user?.id ? c.toUser : c.fromUser;
          const name = users.find((u) => u.id === otherId)?.username ?? "?";
          const pending = c.status === "pending";
          return (
            <div key={c.id} className="group relative">
              <span
                title={pending ? t("together.waiting") : name}
                className={`flex h-9 w-9 items-center justify-center rounded-full bg-[#111] text-xs font-medium text-white ${
                  pending ? "opacity-40 grayscale-[50%]" : ""
                }`}
              >
                {initials(name)}
              </span>
              {pending ? (
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-[#111] px-2 py-0.5 text-[10px] text-white group-hover:block">
                  {t("together.waiting")}
                </div>
              ) : null}
              {pending && c.fromUser === user?.id ? (
                <button
                  type="button"
                  aria-label={t("together.cancel")}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#111] text-white"
                  onClick={() => cancel(c.id)}
                >
                  <X size={9} />
                </button>
              ) : null}
            </div>
          );
        })}
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-[#444]"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-[#cfcfd4] text-[#555]">
            <UserPlus size={15} />
          </span>
          {active.length === 0 ? t("together.do") : null}
        </button>
      </div>

      {open ? (
        <div className="absolute left-0 top-12 z-30 w-56 rounded-2xl border border-[#e8e8ec] bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
          <input
            autoFocus
            className="mb-2 w-full rounded-xl bg-[#ececee] px-3 py-2 text-sm"
            placeholder={t("together.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="max-h-44 overflow-y-auto">
            {friends.length === 0 ? (
              <p className="px-2 py-2 text-xs text-[#888]">{t("together.noFriends")}</p>
            ) : choices.length === 0 ? (
              <p className="px-2 py-2 text-xs text-[#888]">{t("search.empty")}</p>
            ) : (
              choices.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-[#f4f4f5]"
                  onClick={() => pick(f.id)}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111] text-[11px] text-white">
                    {initials(f.name)}
                  </span>
                  {f.name}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
