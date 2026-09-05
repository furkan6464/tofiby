"use client";

import { useEffect, useState } from "react";
import { denyAiAccess, grantAiAccess } from "@/lib/ai";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function AiConsentHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("tofiby:ai-ask", on);
    return () => window.removeEventListener("tofiby:ai-ask", on);
  }, []);

  function close() {
    denyAiAccess();
    setOpen(false);
  }

  return (
    <Modal open={open} onClose={close} title={t("ai.consentTitle")} layer="z-[85]">
      <p className="text-sm text-muted">{t("ai.consentBody")}</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button tone="ghost" type="button" onClick={close}>
          {t("ai.consentNo")}
        </Button>
        <Button
          type="button"
          onClick={() => {
            grantAiAccess();
            setOpen(false);
          }}
        >
          {t("ai.consentYes")}
        </Button>
      </div>
    </Modal>
  );
}
