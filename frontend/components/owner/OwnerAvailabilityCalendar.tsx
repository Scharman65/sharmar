"use client";

type OwnerBlackout = {
  id: number;
  boat_id: number;
  start_utc: string;
  end_utc: string;
  reason?: string;
  created_at?: string;
};

type OwnerAvailabilityCalendarProps = {
  lang: string;
  blackouts: OwnerBlackout[];
};

function localeForLang(lang: string): string {
  if (lang === "ru") return "ru-RU";
  if (lang === "me") return "sr-Latn-ME";
  return "en-US";
}

function dateKeyUtc(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function blackoutCoversDate(blackout: OwnerBlackout, key: string): boolean {
  const start = Date.parse(blackout.start_utc);
  const end = Date.parse(blackout.end_utc);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;

  const dayStart = Date.parse(`${key}T00:00:00.000Z`);
  const dayEnd = Date.parse(`${key}T23:59:59.999Z`);

  return start <= dayEnd && end >= dayStart;
}

function buildDays(): Date[] {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return Array.from({ length: 30 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return day;
  });
}

export function OwnerAvailabilityCalendar({ lang, blackouts }: OwnerAvailabilityCalendarProps) {
  const locale = localeForLang(lang);
  const days = buildDays();

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(86px, 1fr))",
          gap: 8,
        }}
      >
        {days.map((day) => {
          const key = dateKeyUtc(day);
          const todayKey = dateKeyUtc(new Date());
          const isToday = key == todayKey;

          const dayBlackouts = blackouts.filter((blackout) => blackoutCoversDate(blackout, key));
          const isClosed = dayBlackouts.length > 0;

          return (
            <div
              key={key}
              style={{
                minHeight: 86,
                borderRadius: 14,
                border: isToday
                  ? "2px solid #0f172a"
                  : isClosed
                    ? "1px solid rgba(220,38,38,0.35)"
                    : "1px solid rgba(15,23,42,0.10)",

                background: isClosed
                  ? "rgba(220,38,38,0.12)"
                  : isToday
                    ? "rgba(15,23,42,0.08)"
                    : "rgba(255,255,255,0.68)",
                padding: 10,
                display: "grid",
                alignContent: "space-between",
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {new Intl.DateTimeFormat(locale, {
                    weekday: "short",
                    timeZone: "UTC",
                  }).format(day)}
                </div>

                <div style={{ marginTop: 2, fontSize: 18, fontWeight: 800 }}>
                  {new Intl.DateTimeFormat(locale, {
                    day: "2-digit",
                    timeZone: "UTC",
                  }).format(day)}
                </div>
              </div>

              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: isClosed ? "#991b1b" : "#166534",
                }}
              >
                {isClosed ? "Closed" : "Open"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
