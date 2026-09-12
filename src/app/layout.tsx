import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, languages, localeOrDefault } from "@/lib/i18n";
import { LanguageProvider } from "@/components/language/LanguageProvider";
import { Plus_Jakarta_Sans, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-google",
  display: "swap",
});

const fontSerif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif-google",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-google",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kaarva | Scheme Matching Platform",
  description: "Discover loan schemes matched to an applicant's needs.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico" }
    ],
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = localeOrDefault((await cookies()).get(LANGUAGE_COOKIE)?.value);
  return (
    <html lang={locale} className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans text-[#191917] antialiased"><LanguageProvider locale={locale}>
        <div className="relative z-50 border-b border-[#1E3A2B]/15 bg-[#FAF6EE] px-5 py-2 text-right text-sm"><Link href="/language" className="font-semibold text-[#1E3A2B] underline">Language / ಭಾಷೆ / भाषा · {languages[locale]}</Link></div>
        {children}
      </LanguageProvider></body>
    </html>
  );
}

