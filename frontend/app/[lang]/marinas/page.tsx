import Link from "next/link";
import { marinas } from "@/data/marinas";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function MarinasIndexPage({ params }: Props) {
  const { lang } = await params;

  return (
    <main className="main">
      <div className="container marina-index-page">
        <div className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              Mediterranean marina network
            </div>

            <h1>
              Explore yacht charters across Mediterranean marinas
            </h1>

            <p>
              Discover boats, yacht charters, sailing experiences,
              and marina destinations across Montenegro, Croatia,
              and the Mediterranean coastline.
            </p>
          </div>
        </div>

        <section className="marina-section">
          <div className="section-head">
            <h2>Featured marinas</h2>

            <p>
              SEO-ready marina landing pages connected into a scalable
              Mediterranean marketplace structure.
            </p>
          </div>

          <div className="marina-grid">
            {marinas.map((marina) => (
              <Link
                key={marina.slug}
                href={`/${lang}/marina/${marina.slug}`}
                className="marina-card"
              >
                <div className="card-top">
                  <div className="country">
                    {marina.country}
                  </div>

                  <h3>{marina.name}</h3>

                  <div className="location">
                    {marina.city}
                  </div>
                </div>

                <p>
                  {marina.description}
                </p>

                <div className="card-footer">
                  <span>
                    Explore marina
                  </span>

                  <span>
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .marina-index-page {
          padding-bottom: 64px;
        }

        .hero {
          padding: 32px 0 18px;
        }

        .hero-copy {
          max-width: 860px;
        }

        .eyebrow {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.72;
          margin-bottom: 12px;
        }

        h1 {
          margin: 0;
          font-size: 48px;
          line-height: 1.05;
        }

        .hero p {
          margin-top: 18px;
          font-size: 18px;
          line-height: 1.6;
          opacity: 0.82;
          max-width: 720px;
        }

        .marina-section {
          margin-top: 34px;
        }

        .section-head {
          margin-bottom: 20px;
        }

        .section-head h2 {
          margin: 0;
          font-size: 28px;
        }

        .section-head p {
          margin-top: 10px;
          opacity: 0.74;
          max-width: 720px;
          line-height: 1.5;
        }

        .marina-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .marina-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 260px;
          padding: 22px;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          text-decoration: none;
          color: inherit;
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .marina-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,0.22);
          background: rgba(255,255,255,0.06);
        }

        .country {
          font-size: 12px;
          text-transform: uppercase;
          opacity: 0.66;
          letter-spacing: 0.08em;
          margin-bottom: 14px;
        }

        .marina-card h3 {
          margin: 0;
          font-size: 24px;
          line-height: 1.15;
        }

        .location {
          margin-top: 8px;
          opacity: 0.7;
        }

        .marina-card p {
          margin: 18px 0;
          line-height: 1.6;
          opacity: 0.84;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
        }

        @media (max-width: 980px) {
          .marina-grid {
            grid-template-columns: 1fr 1fr;
          }

          h1 {
            font-size: 40px;
          }
        }

        @media (max-width: 720px) {
          .marina-grid {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 34px;
          }

          .hero p {
            font-size: 16px;
          }

          .marina-card {
            min-height: auto;
          }
        }
      `}</style>
    </main>
  );
}
