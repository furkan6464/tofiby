"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { useApp, useSession } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export default function LoginPage() {
  const router = useRouter();
  const login = useApp((s) => s.login);
  const user = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.onboarded) router.replace("/anasayfa");
    else if (user) router.replace("/onboarding");
  }, [user, router]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
      <p className="font-display text-3xl">{t("auth.loginTitle")}</p>
      <p className="mt-2 text-muted">{t("auth.loginSubtitle")}</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const res = login(username, password);
          if (!res.ok) setError(res.error);
          else router.push("/anasayfa");
        }}
      >
        <Field
          label={t("auth.username")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Field
          label={t("auth.password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-sm text-pink">{error}</p> : null}
        <Button className="w-full" type="submit">
          {t("auth.submitLogin")}
        </Button>
      </form>
      <Link href="/kayit" className="mt-6 text-sm text-violet">
        {t("auth.toRegister")}
      </Link>
    </main>
  );
}
