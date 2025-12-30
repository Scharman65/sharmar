import { translateText } from "./openaiTranslate";

const guard = new Set<string>();
function gk(uid: string, id: number | string) { return `${uid}:${id}`; }

export async function ensureI18nTranslations(params: {
  uid: string;
  id: number | string;
  sourceLocale: string;
  targetLocales: string[];
  fields: string[];
}) {
  // Translation must NEVER block saving content.
  try {
    const { uid, id, sourceLocale, targetLocales, fields } = params;

    // @ts-ignore
    const strapiAny: any = global.strapi;

    const key = gk(uid, id);
    if (guard.has(key)) return;
    guard.add(key);

    try {
      const source: any = await strapiAny.entityService.findOne(uid as any, id as any, {
        locale: sourceLocale,
        populate: ["localizations"],
      });
      if (!source) return;

      const locs: any[] = source.localizations ?? [];
      const existingByLocale = new Map<string, any>();
      for (const loc of locs) if (loc?.locale) existingByLocale.set(loc.locale, loc);

      for (const toLocale of targetLocales) {
        const current: any = existingByLocale.get(toLocale);

        const data: Record<string, any> = {};
        let changed = false;

        for (const f of fields) {
          const srcVal = source?.[f];
          if (typeof srcVal !== "string" || srcVal.trim().length === 0) continue;

          const curVal = current?.[f];
          if (typeof curVal === "string" && curVal.trim().length > 0) continue;

          try {
            const out = await translateText({ text: srcVal, from: sourceLocale, to: toLocale });
            data[f] = out;
            changed = true;
          } catch (e: any) {
            strapiAny?.log?.error?.(
              `[autoTranslate] translate failed uid=${uid} id=${id} field=${f} ${sourceLocale}->${toLocale}: ${e?.message || e}`
            );
          }
        }

        if (!changed) continue;

        try {
          if (!current) {
            data.localizations = [id];
            await strapiAny.entityService.create(uid as any, { locale: toLocale, data });
          } else {
            await strapiAny.entityService.update(uid as any, current.id, { locale: toLocale, data });
          }
        } catch (e: any) {
          strapiAny?.log?.error?.(
            `[autoTranslate] upsert failed uid=${uid} id=${id} to=${toLocale}: ${e?.message || e}`
          );
        }
      }
    } finally {
      guard.delete(key);
    }
  } catch (e: any) {
    // last-resort catch
    // @ts-ignore
    const strapiAny: any = global.strapi;
    strapiAny?.log?.error?.(`[autoTranslate] fatal: ${e?.message || e}`);
  }
}
