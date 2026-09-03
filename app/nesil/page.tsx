"use client";

import { t } from "@/lib/i18n";
import { useApp, useSession } from "@/lib/store";
import { FamilyTree } from "@/components/home/FamilyTree";
import { Card } from "@/components/ui/Card";

export default function GenerationPage() {
  const user = useSession();
  const creatures = useApp((s) => s.creatures);
  if (!user) return null;
  const mine = creatures.filter((c) => c.ownerId === user.id);
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="font-display text-4xl">{t("gen.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("gen.hint")}</p>
      <Card className="mt-6 p-5">
        <FamilyTree creatures={mine} />
      </Card>
    </main>
  );
}
