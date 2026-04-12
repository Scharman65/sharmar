import Link from "next/link";

type Props = {
  lang: string;
  boatSlug: string;
  boatTitle: string;
  priceLabel?: string | null;
};

export default function BookingSidebar({
  lang,
  boatSlug,
  boatTitle,
  priceLabel,
}: Props) {
  const requestHref = `/${lang}/request?slug=${encodeURIComponent(boatSlug)}&title=${encodeURIComponent(boatTitle)}&currency=EUR`;

  return (
    <aside
      style={{
        position: "sticky",
        top: "100px",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        padding: "20px",
        background: "#ffffff",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "grid", gap: "16px" }}>
        <div>
          <div
            style={{
              fontSize: "14px",
              lineHeight: 1.4,
              color: "#6b7280",
              marginBottom: "6px",
            }}
          >
            Booking
          </div>

          <div
            style={{
              fontSize: "28px",
              lineHeight: 1.1,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            {priceLabel && priceLabel.trim().length ? priceLabel : "Price on request"}
          </div>

          <div
            style={{
              fontSize: "14px",
              lineHeight: 1.5,
              color: "#4b5563",
              marginTop: "8px",
            }}
          >
            Secure your interest for <b>{boatTitle}</b>. You can request details now and proceed to payment in the next step.
          </div>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <Link
            href={requestHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "48px",
              borderRadius: "12px",
              background: "#111827",
              color: "#ffffff",
              textDecoration: "none",
              fontSize: "16px",
              fontWeight: 600,
              padding: "0 16px",
            }}
          >
            Book now
          </Link>

          <Link
            href={requestHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "48px",
              borderRadius: "12px",
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              textDecoration: "none",
              fontSize: "16px",
              fontWeight: 600,
              padding: "0 16px",
            }}
          >
            Request booking
          </Link>
        </div>

        <div
          style={{
            fontSize: "13px",
            lineHeight: 1.5,
            color: "#6b7280",
          }}
        >
          Availability and final payment flow will be confirmed in the next step.
        </div>
      </div>
    </aside>
  );
}
