import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { Header, MobileBottomNav } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AiChat } from "@/components/ai/AiChat";
import { JsonLd } from "@/components/JsonLd";
import { getAuthUser } from "@/lib/auth";
import { getPublicEnv } from "@/lib/env";
import { APP_NAME } from "@/lib/constants";
import { generateSchemaMarkup, getSeoBaseUrl } from "@/lib/seo";
import { SEO_PRIMARY_KEYWORDS, SEO_SITE } from "@/lib/seo-config";
import { Analytics } from "@/components/analytics/Analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSeoBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${APP_NAME} - Rooms, PG, Flats & Shops in Haryana`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Find rooms, PGs, flats and houses for rent and sale in Kaithal, Kurukshetra, Pundri aur Narwana, Haryana. Apna Room, Ghar Ya Property Yahan Dhundhiye — post your property free.",
  keywords: SEO_PRIMARY_KEYWORDS,
  // No `alternates.canonical` here on purpose: metadata is merged down the tree,
  // so a root-level canonical would be inherited by every page that does not set
  // its own (/help, auth, dashboard, 404) and tell Google they are all the
  // homepage. Each indexable page sets its own canonical instead.
  verification: {
    google: getPublicEnv().googleSiteVerification || undefined,
    other: getPublicEnv().bingSiteVerification
      ? { "msvalidate.01": getPublicEnv().bingSiteVerification }
      : undefined,
  },
  openGraph: {
    title: `${APP_NAME} - Rooms, PG, Flats & Properties in Haryana`,
    description:
      "Find rooms, PGs, flats, houses and shops for rent or sale in Kaithal, Kurukshetra, Pundri and Narwana.",
    siteName: APP_NAME,
    type: "website",
    locale: "en_IN",
    url: `${siteUrl}/`,
    // The default social card is set here explicitly on purpose. Relying on
    // app/opengraph-image.tsx does not work: a page that exports its own
    // `openGraph` object overrides the file-based image, so most routes shipped
    // with no og:image at all. Pages with a real listing photo (see
    // buildListingMetadata) still replace this value.
    images: [{ url: `${siteUrl}${SEO_SITE.defaultImage}`, width: 1200, height: 630, alt: `${APP_NAME} - Rooms, PG, Flats & Properties in Haryana` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} - Rooms, PG, Flats & Properties in Haryana`,
    description: "Find rooms, PGs, flats, houses and shops for rent or sale across Haryana.",
    images: [`${siteUrl}${SEO_SITE.defaultImage}`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d9488",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getAuthUser();
  const profile = user?.profile ?? null;
  const pageSiteUrl = getSeoBaseUrl();
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900">
        <Analytics />
        <ToastProvider>
          {isAdmin ? null : <Header profile={profile} />}
          <main className={`flex-1 ${isAdmin ? "" : "pb-16 md:pb-0"}`}>{children}</main>
          {isAdmin ? null : (
            <>
              <Footer />
              <MobileBottomNav profile={profile} />
              <AiChat />
            </>
          )}
          <JsonLd data={generateSchemaMarkup("WebSite", { name: APP_NAME, url: pageSiteUrl })} />
          <JsonLd data={generateSchemaMarkup("Organization", { name: APP_NAME, url: pageSiteUrl })} />
        </ToastProvider>
      </body>
    </html>
  );
}
