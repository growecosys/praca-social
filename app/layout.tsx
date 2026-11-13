import SkipLink from "../components/skip-link";
import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import PokeReceiver from "../components/poke-receiver";
import PageTranslator from "../components/page-translator";
import NotificationRuntime from "../components/notification-runtime";
import NatureAccent from "../components/nature-accent";
import SignalComposer from "../components/signal-composer";
import PersonalGuide from "../components/personal-guide";
import { getPracaUser } from "../lib/praca-auth";
import { metadataBase } from "../lib/site-url";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: metadataBase(),
  applicationName: "Praça",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Praça", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  title: "Praça — publique sem pedir licença",
  description: "Publique ideias, encontre pessoas e cuide do espaço comum.",
  openGraph: {
    title: "Praça — publique sem pedir licença",
    description: "Publique ideias, encontre pessoas e cuide do espaço comum.",
    type: "website",
    siteName: "Praça",
    locale: "pt_BR",
    images: [
      { url: "/og.png", width: 1792, height: 896, alt: "Praça — publique sem pedir licença" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Praça — publique sem pedir licença",
    description: "Publique ideias, encontre pessoas e cuide do espaço comum.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg?v=praca", type: "image/svg+xml" },
      { url: "/favicon-32.png?v=praca", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png?v=praca", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=praca",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#244e35" };

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getPracaUser();
  return (
    <html lang="pt-BR" className={`${sans.variable} ${serif.variable} bg-background`}>
      <body className="antialiased">
        <SkipLink />
        <PageTranslator />
        <NotificationRuntime userId={user?.profileComplete ? user.id : null} />
        <PokeReceiver />
        {children}
        <NatureAccent />
        <PersonalGuide
          user={
            user
              ? {
                  id: user.id,
                  displayName: user.displayName,
                  profileComplete: user.profileComplete,
                  roleTitle: user.roleTitle,
                  hasAvatar: Boolean(user.avatarImageKey),
                }
              : null
          }
        />
        <SignalComposer signedIn={Boolean(user)} canSubmit={Boolean(user?.profileComplete)} />
      </body>
    </html>
  );
}
