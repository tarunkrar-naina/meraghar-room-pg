import { ImageResponse } from "next/og";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * Site-wide Open Graph / Twitter card image.
 *
 * NOTE: this is NOT the default card actually served. A page that exports its
 * own `openGraph` object overrides file-based images, so root layout sets
 * public/brand/og-default.png as the real default and this route is only used
 * when a page inherits metadata without overriding openGraph. Property pages
 * override it with the actual listing photo (see buildListingMetadata).
 *
 * 1200x630 is the size Facebook, LinkedIn and WhatsApp render without cropping.
 */
export const alt = `${APP_NAME} - Rooms, PG, Flats & Properties in Haryana`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #115e59 100%)",
          padding: "72px 80px",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 700,
              color: "#0d9488",
            }}
          >
            M
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>{APP_NAME}</div>
        </div>

        {/* Value proposition */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, letterSpacing: -2 }}>
            Rooms, PG, Flats &amp; Shops
          </div>
          <div style={{ fontSize: 38, opacity: 0.92 }}>{APP_TAGLINE}</div>
        </div>

        {/* Target cities double as keyword copy */}
        <div style={{ display: "flex", gap: 14, fontSize: 28, opacity: 0.9 }}>
          {["Kaithal", "Kurukshetra", "Pundri", "Narwana"].map((city) => (
            <div
              key={city}
              style={{
                border: "2px solid rgba(255,255,255,0.45)",
                borderRadius: 999,
                padding: "10px 26px",
              }}
            >
              {city}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
