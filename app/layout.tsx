import type { Metadata, Viewport } from "next";
import { Fredoka, Press_Start_2P } from "next/font/google";
import { t } from "@/lib/i18n";
import { Providers } from "@/components/layout/Providers";
import "./globals.css";

const display = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const pixel = Press_Start_2P({
  subsets: ["latin"],
  variable: "--font-pixel",
  weight: "400",
});

export const metadata: Metadata = {
  title: t("meta.title"),
  description: t("meta.description"),
  applicationName: t("brand.name"),
  appleWebApp: {
    capable: true,
    title: t("brand.name"),
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#07060B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${display.variable} ${pixel.variable}`}>
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{ fontFamily: "Satoshi, var(--font-body), system-ui, sans-serif" }}
        className="antialiased"
      >
        <div className="grain" aria-hidden />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
