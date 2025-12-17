import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link
          href="/boats"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <Image
            src="/brand/logo.svg"
            alt="Sharmar Boats"
            width={180}
            height={48}
            priority
          />
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/boats" style={{ color: "inherit", opacity: 0.85, textDecoration: "none" }}>
            Boats
          </Link>
        </nav>
      </div>
    </header>
  );
}
