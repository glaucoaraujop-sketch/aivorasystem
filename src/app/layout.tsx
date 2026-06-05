import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const viewport: Viewport = {
  themeColor: "#0075FF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const BASE_URL = "https://www.aivoratecnologia.com.br";

export const metadata: Metadata = {
  title: "Aivora Tecnologia",
  description: "Sistemas inteligentes com IA, automação e integração.",
  metadataBase: new URL(BASE_URL),
  manifest: "/manifest.json",

  // Open Graph — aparece ao compartilhar no WhatsApp, LinkedIn, etc.
  openGraph: {
    title: "Aivora Tecnologia",
    description: "Sistemas inteligentes com IA, automação e integração.",
    url: BASE_URL,
    siteName: "Aivora Tecnologia",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Aivora Tecnologia",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },

  // Twitter / X
  twitter: {
    card: "summary_large_image",
    title: "Aivora Tecnologia",
    description: "Sistemas inteligentes com IA, automação e integração.",
    images: ["/og-image.jpg"],
  },

  // PWA / iOS
  appleWebApp: {
    capable: true,
    title: "Aivora Tecnologia",
    statusBarStyle: "black-translucent",
  },

  // Ícones
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16",   type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32",   type: "image/png" },
      { url: "/icons/icon-192.png",   sizes: "192x192", type: "image/png" },
    ],
    apple:    "/icons/apple-touch-icon.png",
    shortcut: "/icons/favicon-32.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
