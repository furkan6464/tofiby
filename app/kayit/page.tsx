"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export default function RegisterPage() {
  const router = useRouter();
  const register = useApp((s) => s.register);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
      <p className="font-display text-3xl">{t("auth.registerTitle")}</p>
      <p className="mt-2 text-muted">{t("auth.registerSubtitle")}</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const res = register({ username, email, password });
          if (!res.ok) setError(res.error);
          else router.push("/onboarding");
        }}
      >
        <Field
          label={t("auth.username")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Field
          label={t("auth.email")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label={t("auth.password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-sm text-pink">{error}</p> : null}
        <Button className="w-full" type="submit">
          {t("auth.submitRegister")}
        </Button>
      </form>
      <Link href="/giris" className="mt-6 text-sm text-violet">
        {t("auth.toLogin")}
      </Link>
    </main>
  );
}
