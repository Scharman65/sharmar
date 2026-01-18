"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/i18n";

type Labels = {
  rent: string;
  sale: string;
  motor: string;
  sail: string;
  catamaran: string;
  superyacht: string;
  soon: string;
};

function useOutsideClose(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ref, onClose]);
}

function Menu({
  label,
  items,
}: {
  label: string;
  items: Array<
    | { kind: "link"; href: string; text: string }
    | { kind: "soon"; text: string; badge: string }
  >;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, () => setOpen(false));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="nav-button"
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
      >
        {label} · <span aria-hidden="true">▼</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 8,
            minWidth: 220,
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,.12)",
            background: "rgba(255,255,255,.98)",
            boxShadow: "0 10px 30px rgba(0,0,0,.12)",
            padding: 8,
            zIndex: 50,
          }}
          className="dark:border-white/[.18] dark:bg-black/90"
        >
          {items.map((it, idx) => {
            if (it.kind === "link") {
              return (
                <Link
                  key={idx}
                  role="menuitem"
                  href={it.href}
                  className="dropdown-item"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    margin: 0,
                    padding: "10px 12px",
                    borderRadius: 12,
                  }}
                  onClick={() => setOpen(false)}
                >
                  <span>{it.text}</span>
                </Link>
              );
            }

            return (
              <div
                key={idx}
                aria-disabled="true"
                className="dropdown-item"
                style={{
                  opacity: 0.55,
                  cursor: "not-allowed",
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  margin: 0,
                  padding: "10px 12px",
                  borderRadius: 12,
                }}
              >
                <span>{it.text}</span>
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(0,0,0,.12)",
                  }}
                  className="dark:border-white/[.18]"
                >
                  {it.badge}
                </span>
              </div>
            );
          })}

          <style jsx>{`
            :global(.dropdown-item) {
              color: rgba(0, 0, 0, 0.88);
              text-decoration: none;
            }
            :global(.dropdown-item:hover) {
              background: rgba(0, 0, 0, 0.06);
            }
            :global(.dark .dropdown-item) {
              color: rgba(255, 255, 255, 0.92);
            }
            :global(.dark .dropdown-item:hover) {
              background: rgba(255, 255, 255, 0.08);
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default function HeaderTopNav({
  lang,
  labels,
}: {
  lang: Lang;
  labels: Labels;
}) {
  return (
    <>
      <Menu
        label={labels.rent}
        items={[
          { kind: "link", href: `/${lang}/rent/motor`, text: labels.motor },
          { kind: "link", href: `/${lang}/rent/sail`, text: labels.sail },
          { kind: "link", href: `/${lang}/rent/catamaran`, text: labels.catamaran },
          { kind: "soon", text: labels.superyacht, badge: labels.soon },
        ]}
      />
      <Menu
        label={labels.sale}
        items={[
          { kind: "link", href: `/${lang}/sale/motor`, text: labels.motor },
          { kind: "link", href: `/${lang}/sale/sail`, text: labels.sail },
          { kind: "link", href: `/${lang}/sale/catamaran`, text: labels.catamaran },
          { kind: "soon", text: labels.superyacht, badge: labels.soon },
        ]}
      />
    </>
  );
}
