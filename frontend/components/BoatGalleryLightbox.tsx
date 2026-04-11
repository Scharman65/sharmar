"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

type GalleryImage = {
  url: string;
  alt?: string | null;
};

type Props = {
  images: GalleryImage[];
  boatTitle?: string;
};

export default function BoatGalleryLightbox({ images, boatTitle }: Props) {
  const validImages = useMemo(
    () => images.filter((img) => typeof img?.url === "string" && img.url.trim().length > 0),
    [images]
  );

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const isOpen = openIndex !== null;
  const currentIndex = openIndex ?? 0;
  const currentImage = validImages[currentIndex] ?? null;

  const openAt = useCallback((index: number) => {
    if (index < 0 || index >= validImages.length) return;
    setOpenIndex(index);
  }, [validImages.length]);

  const close = useCallback(() => {
    setOpenIndex(null);
  }, []);

  const showPrev = useCallback(() => {
    if (!validImages.length) return;
    setOpenIndex((prev) => {
      if (prev === null) return prev;
      return prev === 0 ? validImages.length - 1 : prev - 1;
    });
  }, [validImages.length]);

  const showNext = useCallback(() => {
    if (!validImages.length) return;
    setOpenIndex((prev) => {
      if (prev === null) return prev;
      return prev === validImages.length - 1 ? 0 : prev + 1;
    });
  }, [validImages.length]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") showPrev();
      if (event.key === "ArrowRight") showNext();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close, showPrev, showNext]);

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
    touchEndX.current = null;
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = () => {
    const start = touchStartX.current;
    const end = touchEndX.current;

    touchStartX.current = null;
    touchEndX.current = null;

    if (start === null || end === null) return;

    const delta = start - end;
    const threshold = 50;

    if (delta > threshold) showNext();
    if (delta < -threshold) showPrev();
  };

  if (!validImages.length) {
    return null;
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
        }}
      >
        {validImages.map((img, index) => (
          <button
            key={`${img.url}-${index}`}
            type="button"
            onClick={() => openAt(index)}
            aria-label={`Open image ${index + 1}`}
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "4 / 3",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              overflow: "hidden",
              background: "#f9fafb",
              cursor: "zoom-in",
              padding: 0,
            }}
          >
            <Image
              src={img.url}
              alt={img.alt || boatTitle || `Boat image ${index + 1}`}
              fill
              sizes="(max-width: 900px) 50vw, 240px"
              style={{ objectFit: "cover" }}
            />
          </button>
        ))}
      </div>

      {isOpen && currentImage ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={boatTitle ? `${boatTitle} gallery` : "Boat gallery"}
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "1200px",
              height: "100%",
              maxHeight: "90vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close gallery"
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                zIndex: 1002,
                width: "44px",
                height: "44px",
                border: "none",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.16)",
                color: "#fff",
                fontSize: "28px",
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>

            {validImages.length > 1 ? (
              <button
                type="button"
                onClick={showPrev}
                aria-label="Previous image"
                style={{
                  position: "absolute",
                  left: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 1002,
                  width: "44px",
                  height: "44px",
                  border: "none",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.16)",
                  color: "#fff",
                  fontSize: "28px",
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ‹
              </button>
            ) : null}

            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minHeight: "320px",
              }}
            >
              <Image
                src={currentImage.url}
                alt={currentImage.alt || boatTitle || `Boat image ${currentIndex + 1}`}
                fill
                priority
                sizes="100vw"
                style={{
                  objectFit: "contain",
                }}
              />
            </div>

            {validImages.length > 1 ? (
              <button
                type="button"
                onClick={showNext}
                aria-label="Next image"
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 1002,
                  width: "44px",
                  height: "44px",
                  border: "none",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.16)",
                  color: "#fff",
                  fontSize: "28px",
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ›
              </button>
            ) : null}

            <div
              style={{
                position: "absolute",
                bottom: "8px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1002,
                padding: "8px 12px",
                borderRadius: "999px",
                background: "rgba(0,0,0,0.45)",
                color: "#fff",
                fontSize: "14px",
              }}
            >
              {currentIndex + 1} / {validImages.length}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
