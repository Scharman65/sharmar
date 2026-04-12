"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/i18n";

export default function AddAuthGuard({ lang }: { lang: Lang }) {
  const router = useRouter();

  useEffect(() => {
    try {
      const token = localStorage.getItem("sharmar_jwt");
      if (!token) {
        router.replace(`/${lang}/login`);
      }
    } catch {
      router.replace(`/${lang}/login`);
    }
  }, [lang, router]);

  return null;
}
