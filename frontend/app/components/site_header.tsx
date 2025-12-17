import Link from "next/link";
import Image from "next/image";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label="Sharmar Boats">
          <Image
            src="/brand/logo.svg"
            alt="Sharmar Boats"
            width={132}
            height={28}
            priority
          />
        </Link>

        <nav className="nav">
          <Link className="nav__link" href="/boats">
            Boats
          </Link>
        </nav>
      </div>
    </header>
  );
}
