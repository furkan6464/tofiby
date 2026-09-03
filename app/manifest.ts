import type { MetadataRoute } from "next";
import { t } from "@/lib/i18n";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t("brand.name"),
    short_name: t("brand.name"),
    description: t("meta.description"),
    start_url: "/anasayfa",
    display: "standalone",
    background_color: "#07060B",
    theme_color: "#07060B",
    lang: "tr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
