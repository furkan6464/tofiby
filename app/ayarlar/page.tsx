"use client";

import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { detectTimezone } from "@/lib/dates";
import { useApp, useSession } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";

export default function SettingsPage() {
  const router = useRouter();
  const user = useSession();
  const update = useApp((s) => s.updateSettings);
  const logout = useApp((s) => s.logout);
  if (!user) return null;

  return (
    <main className="safe-pad mx-auto max-w-xl px-5 py-8">
      <h1 className="font-display text-4xl">{t("settings.title")}</h1>
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
