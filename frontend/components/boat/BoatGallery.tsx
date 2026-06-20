"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type GalleryImage = {
  id: number;
  url: string;
  alternativeText?: string | null;
};

type HeroImage = {
  src: string;
  alt: string;
};

type BoatGalleryProps = {
  heroImg: HeroImage | null;
  images?: GalleryImage[];
  title: string;
  slug: string;
};

export function BoatGallery({ heroImg, images = [], title, slug }: BoatGalleryProps) {
  const galleryImages = useMemo(() => {
    const list: GalleryImage[] = [];

    if (heroImg?.src) {
      list.push({
        id: -1,
        url: heroImg.src,
        alternativeText: heroImg.alt,
      });
    }

    for (const img of images) {
      if (!img?.url) continue;
      if (list.some((x) => x.url === img.url)) continue;
      list.push(img);
    }

    return list;
  }, [heroImg, images]);

  const [selectedUrl, setSelectedUrl] = useState<string | null>(
    galleryImages[0]?.url ?? null
  );

  const selected =
    galleryImages.find((img) => img.url === selectedUrl) ?? galleryImages[0];

  if (!selected) return null;

  const selectedAlt = selected.alternativeText ?? title ?? slug;

  return (
    <section aria-label="Boat photo gallery">
      <div className="hero">
        <Image
          src={selected.url}
          alt={selectedAlt}
          fill
          sizes="(max-width: 900px) 100vw, 900px"
          style={{ objectFit: "cover" }}
          priority
        />
      </div>

      {galleryImages.length > 1 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          {galleryImages.map((img) => {
            const isActive = img.url === selected.url;

            return (
              <button
                key={`${img.id}-${img.url}`}
                type="button"
                onClick={() => setSelectedUrl(img.url)}
                aria-label={`Open photo: ${img.alternativeText ?? title ?? slug}`}
                style={{
                  position: "relative",
                  aspectRatio: "4 / 3",
                  overflow: "hidden",
                  borderRadius: 12,
                  border: isActive ? "2px solid currentColor" : "1px solid rgba(0,0,0,0.12)",
                  padding: 0,
                  cursor: "pointer",
                  background: "transparent",
                  opacity: isActive ? 1 : 0.82,
                }}
              >
                <Image
                  src={img.url}
                  alt={img.alternativeText ?? title ?? slug}
                  fill
                  sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 260px"
                  style={{ objectFit: "cover" }}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
