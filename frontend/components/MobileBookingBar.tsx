"use client";

import Link from "next/link";

type Props = {
  lang: string;
  boatSlug: string;
  priceLabel?: string | null;
};

export default function MobileBookingBar({
  lang,
  boatSlug,
  priceLabel,
}: Props) {
  const href = `/${lang}/request?boat=${encodeURIComponent(boatSlug)}`;

  return (
    <>
      <style>{`
        .mobile-booking-bar-root {
          display: none;
        }

        @media (max-width: 900px) {
          .mobile-booking-bar-root {
            display: block;
          }
        }
      `}</style>

      <div className="mobile-booking-bar-root">
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 2000,
            background: "#ffffff",
            borderTop: "1px solid #e5e7eb",
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              display: "flex",
              gap: "12px",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "16px" }}>
              {priceLabel && priceLabel.trim().length
                ? priceLabel
                : "Price on request"}
            </div>

            <Link
              href={href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: "44px",
                padding: "0 18px",
                borderRadius: "10px",
                background: "#111827",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "15px",
                whiteSpace: "nowrap",
              }}
            >
              Book now
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
