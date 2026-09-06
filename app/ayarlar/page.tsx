"use client";

import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { detectTimezone } from "@/lib/dates";
import { downloadText, dumpCsv, dumpJson } from "@/lib/exportData";
import { useActiveCreature, useApp, useSession } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";

export default function SettingsPage() {
  const router = useRouter();
  const user = useSession();
  const update = useApp((s) => s.updateSettings);
  const logout = useApp((s) => s.logout);
  const wipe = useApp((s) => s.deleteAccount);
  const creature = useActiveCreature();
  const goals = useApp((s) => s.goals);
  const milestones = useApp((s) => s.milestones);
  const tasks = useApp((s) => s.tasks);
  const scores = useApp((s) => s.scores);
  const removeMemory = useApp((s) => s.removeMemory);
  const clearMemory = useApp((s) => s.clearMemory);
  const memoryAll = useApp((s) => s.aiMemory);
  if (!user) return null;
  const memory = (Array.isArray(memoryAll) ? memoryAll : []).filter((n) => n.userId === user.id);

  return (
    <main className="safe-pad mx-auto max-w-xl px-5 py-8">
      <h1 className="hidden font-display text-4xl lg:block">{t("settings.title")}</h1>
      <Card className="mt-6 space-y-4 p-5">
        <p className="text-sm text-faint">{t("settings.account")}</p>
        <p className="font-display text-2xl">@{user.username}</p>
        <p className="text-sm text-muted">{user.email}</p>
        <Field
          label={t("settings.timezone")}
          value={user.timezone}
          onChange={(e) => update({ timezone: e.target.value || detectTimezone() })}
        />
      </Card>
      <Card className="mt-4 space-y-3 p-5">
        <p className="text-sm text-faint">{t("settings.theme")}</p>
        <div className="flex gap-2">
          {(["ink", "dusk"] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => update({ theme })}
              className={`rounded-chip px-3 py-2 text-sm ${user.theme === theme ? "bg-raised" : "text-faint"}`}
            >
              {t(theme === "ink" ? "settings.themeInk" : "settings.themeDusk")}
            </button>
          ))}
        </div>
      </Card>
      <Card className="mt-4 space-y-3 p-5">
        <p className="text-sm text-faint">{t("rest.title")}</p>
        <p className="text-xs text-muted">{t("rest.hint")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-chip px-3 py-2 text-sm ${user.restDayOfWeek === null ? "bg-raised" : "text-faint"}`}
            onClick={() => update({ restDayOfWeek: null })}
          >
            {t("rest.none")}
          </button>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button
              key={d}
              className={`rounded-chip px-3 py-2 text-sm ${user.restDayOfWeek === d ? "bg-raised" : "text-faint"}`}
              onClick={() => update({ restDayOfWeek: d })}
            >
              {t(`days.${["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d]}`)}
            </button>
          ))}
        </div>
      </Card>
      <Card className="mt-4 space-y-3 p-5">
        <p className="text-sm text-faint">{t("settings.aiTitle")}</p>
        <p className="text-xs text-muted">{t("settings.aiHint")}</p>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{t("settings.aiOptIn")}</span>
          <input
            type="checkbox"
            checked={Boolean(user.aiOptIn)}
            onChange={(e) => update({ aiOptIn: e.target.checked })}
          />
        </label>
        <p className="text-[11px] text-faint">{user.aiOptIn ? t("settings.aiOn") : t("settings.aiOff")}</p>
      </Card>
      {user.aiOptIn ? (
        <Card className="mt-4 space-y-3 p-5">
          <p className="text-sm text-faint">{t("settings.memoryTitle")}</p>
          <p className="text-xs text-muted">{t("settings.memoryHint")}</p>
          {memory.length === 0 ? <p className="text-sm text-faint">{t("settings.memoryEmpty")}</p> : null}
          <ul className="space-y-2">
            {memory.map((note) => (
              <li key={note.id} className="flex items-start justify-between gap-3 rounded-2xl bg-raised px-3 py-2">
                <p className="min-w-0 flex-1 text-sm">{note.text}</p>
                <button
                  type="button"
                  className="shrink-0 text-xs text-faint hover:text-pink"
                  onClick={() => removeMemory(note.id)}
                >
                  {t("common.delete")}
                </button>
              </li>
            ))}
          </ul>
          {memory.length > 0 ? (
            <Button
              tone="ghost"
              onClick={() => {
                if (!window.confirm(t("settings.memoryClearAsk"))) return;
                clearMemory();
              }}
            >
              {t("settings.memoryClear")}
            </Button>
          ) : null}
        </Card>
      ) : null}
      <Card className="mt-4 space-y-3 p-5">
        <p className="text-sm text-faint">{t("settings.notify")}</p>
        <label className="flex items-center justify-between text-sm">
          <span>{t("settings.notifyPoke")}</span>
          <input
            type="checkbox"
            checked={user.notifyPoke}
            onChange={(e) => update({ notifyPoke: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          <span>{t("settings.notifyEvo")}</span>
          <input
            type="checkbox"
            checked={user.notifyEvolution}
            onChange={(e) => update({ notifyEvolution: e.target.checked })}
          />
        </label>
      </Card>
      <Card className="mt-4 space-y-3 p-5">
        <p className="text-sm text-faint">{t("data.title")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            tone="ghost"
            onClick={() =>
              downloadText(
                "tofiby.json",
                dumpJson({
                  user,
                  creature,
                  goals: goals.filter((g) => g.userId === user.id),
                  milestones,
                  tasks: tasks.filter((x) => x.userId === user.id),
                  scores: scores.filter((s) => s.userId === user.id),
                }),
                "application/json",
              )
            }
          >
            {t("data.json")}
          </Button>
          <Button
            tone="ghost"
            onClick={() =>
              downloadText(
                "tofiby-tasks.csv",
                dumpCsv(tasks.filter((x) => x.userId === user.id)),
                "text/csv",
              )
            }
          >
            {t("data.csv")}
          </Button>
        </div>
        <p className="text-xs text-muted">{t("data.deleteHint")}</p>
        <Button
          tone="danger"
          onClick={async () => {
            if (!window.confirm(t("data.confirm"))) return;
            const res = await wipe();
            if (!res.ok) {
              window.alert(res.error ?? t("data.deleteCloudFail"));
              return;
            }
            router.push("/");
          }}
        >
          {t("data.delete")}
        </Button>
      </Card>
      <Button
        tone="ghost"
        className="mt-4"
        onClick={() => {
          if (typeof Notification !== "undefined") {
            Notification.requestPermission().catch(() => undefined);
          }
        }}
      >
        {t("remind.enable")}
      </Button>
      <Button
        tone="danger"
        className="mt-8"
        onClick={() => {
          logout();
          router.push("/");
        }}
      >
        {t("settings.danger")}
      </Button>
    </main>
  );
}
