export type MarinaTextLang = "en" | "ru" | "me";

type LocalizedText = Record<MarinaTextLang, string>;

export type MarinaDefinition = {
  slug: string;
  city: string;
  country: string;
  region: string;
  title: string;
  description: string;
  descriptions: LocalizedText;
  seoTitle: string;
  seoTitles: LocalizedText;
  seoDescription: string;
  seoDescriptions: LocalizedText;
};

function normalizeMarinaTextLang(lang: string | null | undefined): MarinaTextLang {
  return lang === "ru" || lang === "me" ? lang : "en";
}

export function getMarinaDescription(marina: MarinaDefinition, lang: string | null | undefined): string {
  return marina.descriptions[normalizeMarinaTextLang(lang)] ?? marina.description;
}

export function getMarinaSeoTitle(marina: MarinaDefinition, lang: string | null | undefined): string {
  return marina.seoTitles[normalizeMarinaTextLang(lang)] ?? marina.seoTitle;
}

export function getMarinaSeoDescription(marina: MarinaDefinition, lang: string | null | undefined): string {
  return marina.seoDescriptions[normalizeMarinaTextLang(lang)] ?? marina.seoDescription;
}

export const MARINAS: MarinaDefinition[] = [
  {
    slug: "porto-montenegro",
    city: "Tivat",
    country: "Montenegro",
    region: "Adriatic Sea",
    title: "Porto Montenegro Marina",
    description:
      "Luxury yacht marina in Tivat with premium motor yachts, catamarans, and sailing boats.",
    descriptions: {
      en: "Luxury yacht marina in Tivat with premium motor yachts, catamarans, and sailing boats.",
      ru: "Премиальная яхтенная марина в Тивате с моторными яхтами, катамаранами и парусными лодками.",
      me: "Luksuzna marina u Tivtu sa premium motornim jahtama, katamaranima i jedrilicama.",
    },
    seoTitle:
      "Porto Montenegro Yacht Rentals & Boats for Sale | Sharmar",
    seoTitles: {
      en: "Porto Montenegro Yacht Rentals & Boats for Sale | Sharmar",
      ru: "Аренда яхт и лодки на продажу в Porto Montenegro | Sharmar",
      me: "Najam jahti i plovila na prodaju u Porto Montenegro | Sharmar",
    },
    seoDescription:
      "Explore yacht rentals, catamarans, sailing boats, and premium charters in Porto Montenegro.",
    seoDescriptions: {
      en: "Explore yacht rentals, catamarans, sailing boats, and premium charters in Porto Montenegro.",
      ru: "Изучите аренду яхт, катамараны, парусные лодки и премиальные чартеры в Porto Montenegro.",
      me: "Istražite najam jahti, katamarane, jedrilice i premium charter ponudu u Porto Montenegro.",
    },
  },

  {
    slug: "budva-marina",
    city: "Budva",
    country: "Montenegro",
    region: "Adriatic Sea",
    title: "Budva Marina",
    description:
      "Discover yacht rentals and boats for sale in Budva Marina on the Adriatic coast.",
    descriptions: {
      en: "Discover yacht rentals and boats for sale in Budva Marina on the Adriatic coast.",
      ru: "Откройте аренду яхт и лодки на продажу в Budva Marina на Адриатическом побережье.",
      me: "Istražite najam jahti i plovila na prodaju u Budva Marina na obali Jadrana.",
    },
    seoTitle:
      "Budva Marina Yacht Rentals & Boats for Sale | Sharmar",
    seoTitles: {
      en: "Budva Marina Yacht Rentals & Boats for Sale | Sharmar",
      ru: "Аренда яхт и лодки на продажу в Budva Marina | Sharmar",
      me: "Najam jahti i plovila na prodaju u Budva Marina | Sharmar",
    },
    seoDescription:
      "Browse motor yachts, sailing boats, and catamarans available in Budva Marina.",
    seoDescriptions: {
      en: "Browse motor yachts, sailing boats, and catamarans available in Budva Marina.",
      ru: "Просматривайте моторные яхты, парусные лодки и катамараны, доступные в Budva Marina.",
      me: "Pregledajte motorne jahte, jedrilice i katamarane dostupne u Budva Marina.",
    },
  },

  {
    slug: "kotor-marina",
    city: "Kotor",
    country: "Montenegro",
    region: "Bay of Kotor",
    title: "Kotor Marina",
    description:
      "Premium marina access to the Bay of Kotor with yacht rentals and sailing experiences.",
    descriptions: {
      en: "Premium marina access to the Bay of Kotor with yacht rentals and sailing experiences.",
      ru: "Премиальный доступ к Бока-Которской бухте с арендой яхт и морскими маршрутами.",
      me: "Premium pristup Bokokotorskom zalivu uz najam jahti i nautička iskustva.",
    },
    seoTitle:
      "Kotor Marina Yacht Rentals & Sailing Boats | Sharmar",
    seoTitles: {
      en: "Kotor Marina Yacht Rentals & Sailing Boats | Sharmar",
      ru: "Аренда яхт и парусных лодок в Kotor Marina | Sharmar",
      me: "Najam jahti i jedrilica u Kotor Marina | Sharmar",
    },
    seoDescription:
      "Find sailing boats, catamarans, and yacht charters in Kotor Marina.",
    seoDescriptions: {
      en: "Find sailing boats, catamarans, and yacht charters in Kotor Marina.",
      ru: "Найдите парусные лодки, катамараны и яхтенные чартеры в Kotor Marina.",
      me: "Pronađite jedrilice, katamarane i yacht charter ponudu u Kotor Marina.",
    },
  },

  {
    slug: "bar",
    city: "Bar",
    country: "Montenegro",
    region: "Adriatic Sea",
    title: "Bar Marina",
    description:
      "Yacht and boat rental marina in Bar with access to southern Montenegro and Adriatic routes.",
    descriptions: {
      en: "Yacht and boat rental marina in Bar with access to southern Montenegro and Adriatic routes.",
      ru: "Марина в Баре для аренды яхт и лодок с выходом к маршрутам юга Черногории и Адриатики.",
      me: "Marina u Baru za najam jahti i plovila sa pristupom rutama južne Crne Gore i Jadrana.",
    },
    seoTitle:
      "Bar Marina Yacht Rentals & Motor Boats | Sharmar",
    seoTitles: {
      en: "Bar Marina Yacht Rentals & Motor Boats | Sharmar",
      ru: "Аренда яхт и моторных лодок в марине Бара | Sharmar",
      me: "Najam jahti i motornih plovila u marini Bar | Sharmar",
    },
    seoDescription:
      "Browse motor yachts, sailing boats, and routes available from Bar Marina in Montenegro.",
    seoDescriptions: {
      en: "Browse motor yachts, sailing boats, and routes available from Bar Marina in Montenegro.",
      ru: "Смотрите моторные яхты, парусные лодки и маршруты, доступные из марины Бара в Черногории.",
      me: "Pregledajte motorne jahte, jedrilice i rute dostupne iz marine Bar u Crnoj Gori.",
    },
  },

  {
    slug: "dubrovnik-marina",
    city: "Dubrovnik",
    country: "Croatia",
    region: "Adriatic Sea",
    title: "Dubrovnik Marina",
    description:
      "Mediterranean yacht rentals and boat marketplace near Dubrovnik Old Town.",
    descriptions: {
      en: "Mediterranean yacht rentals and boat marketplace near Dubrovnik Old Town.",
      ru: "Средиземноморская аренда яхт и маркетплейс лодок рядом со Старым городом Дубровника.",
      me: "Mediteranski najam jahti i marketplace plovila blizu starog grada Dubrovnika.",
    },
    seoTitle:
      "Dubrovnik Yacht Rentals & Boats for Sale | Sharmar",
    seoTitles: {
      en: "Dubrovnik Yacht Rentals & Boats for Sale | Sharmar",
      ru: "Аренда яхт и лодки на продажу в Дубровнике | Sharmar",
      me: "Najam jahti i plovila na prodaju u Dubrovniku | Sharmar",
    },
    seoDescription:
      "Discover premium yacht charters and sailing boats in Dubrovnik Marina.",
    seoDescriptions: {
      en: "Discover premium yacht charters and sailing boats in Dubrovnik Marina.",
      ru: "Изучите премиальные яхтенные чартеры и парусные лодки в Dubrovnik Marina.",
      me: "Istražite premium yacht charter ponudu i jedrilice u Dubrovnik Marina.",
    },
  },

  {
    slug: "split-marina",
    city: "Split",
    country: "Croatia",
    region: "Adriatic Sea",
    title: "Split Marina",
    description:
      "Explore catamarans, sailing yachts, and motor boats in Split Marina.",
    descriptions: {
      en: "Explore catamarans, sailing yachts, and motor boats in Split Marina.",
      ru: "Изучите катамараны, парусные яхты и моторные лодки в Split Marina.",
      me: "Istražite katamarane, jedrilice i motorna plovila u Split Marina.",
    },
    seoTitle:
      "Split Marina Yacht Rentals & Sailing Boats | Sharmar",
    seoTitles: {
      en: "Split Marina Yacht Rentals & Sailing Boats | Sharmar",
      ru: "Аренда яхт и парусных лодок в Split Marina | Sharmar",
      me: "Najam jahti i jedrilica u Split Marina | Sharmar",
    },
    seoDescription:
      "Browse yacht charters and premium boats in Split Marina on the Adriatic coast.",
    seoDescriptions: {
      en: "Browse yacht charters and premium boats in Split Marina on the Adriatic coast.",
      ru: "Просматривайте яхтенные чартеры и премиальные лодки в Split Marina на Адриатическом побережье.",
      me: "Pregledajte yacht charter ponudu i premium plovila u Split Marina na obali Jadrana.",
    },
  },

  {
    slug: "athens-marina",
    city: "Athens",
    country: "Greece",
    region: "Saronic Gulf",
    title: "Athens Marina",
    description:
      "Explore yacht charters and marina destinations in Athens for sailing routes around Greece and the Greek islands.",
    descriptions: {
      en: "Explore yacht charters and marina destinations in Athens for sailing routes around Greece and the Greek islands.",
      ru: "Изучите яхтенные чартеры и марины Афин для маршрутов по Греции и греческим островам.",
      me: "Istražite yacht charter i marine u Atini za rute oko Grčke i grčkih ostrva.",
    },
    seoTitle:
      "Athens Marina Yacht Rentals & Sailing Boats | Sharmar",
    seoTitles: {
      en: "Athens Marina Yacht Rentals & Sailing Boats | Sharmar",
      ru: "Аренда яхт и парусных лодок в Athens Marina | Sharmar",
      me: "Najam jahti i jedrilica u Athens Marina | Sharmar",
    },
    seoDescription:
      "Explore yacht charters, catamarans, sailing boats, and marina destinations in Athens, Greece.",
    seoDescriptions: {
      en: "Explore yacht charters, catamarans, sailing boats, and marina destinations in Athens, Greece.",
      ru: "Изучите яхтенные чартеры, катамараны, парусные лодки и марины в Афинах, Греция.",
      me: "Istražite yacht charter, katamarane, jedrilice i marine u Atini, Grčka.",
    },
  },

  {
    slug: "mykonos-marina",
    city: "Mykonos",
    country: "Greece",
    region: "Cyclades",
    title: "Mykonos Marina",
    description:
      "Explore yacht charters and marina destinations in Mykonos for Cyclades sailing and Greek island routes.",
    descriptions: {
      en: "Explore yacht charters and marina destinations in Mykonos for Cyclades sailing and Greek island routes.",
      ru: "Изучите яхтенные чартеры и марины Миконоса для маршрутов по Кикладам и греческим островам.",
      me: "Istražite yacht charter i marine na Mikonosu za rute kroz Kiklade i grčka ostrva.",
    },
    seoTitle:
      "Mykonos Marina Yacht Rentals & Catamarans | Sharmar",
    seoTitles: {
      en: "Mykonos Marina Yacht Rentals & Catamarans | Sharmar",
      ru: "Аренда яхт и катамаранов в Mykonos Marina | Sharmar",
      me: "Najam jahti i katamarana u Mykonos Marina | Sharmar",
    },
    seoDescription:
      "Explore yacht charters, catamarans, sailing boats, and marina destinations in Mykonos, Greece.",
    seoDescriptions: {
      en: "Explore yacht charters, catamarans, sailing boats, and marina destinations in Mykonos, Greece.",
      ru: "Изучите яхтенные чартеры, катамараны, парусные лодки и марины на Миконосе, Греция.",
      me: "Istražite yacht charter, katamarane, jedrilice i marine na Mikonosu, Grčka.",
    },
  },

  {
    slug: "santorini-marina",
    city: "Santorini",
    country: "Greece",
    region: "Cyclades",
    title: "Santorini Marina",
    description:
      "Explore yacht charters and marina destinations in Santorini for sailing routes around the Cyclades and Greek islands.",
    descriptions: {
      en: "Explore yacht charters and marina destinations in Santorini for sailing routes around the Cyclades and Greek islands.",
      ru: "Изучите яхтенные чартеры и марины Санторини для маршрутов по Кикладам и греческим островам.",
      me: "Istražite yacht charter i marine na Santoriniju za rute oko Kiklada i grčkih ostrva.",
    },
    seoTitle:
      "Santorini Marina Yacht Rentals & Sailing Boats | Sharmar",
    seoTitles: {
      en: "Santorini Marina Yacht Rentals & Sailing Boats | Sharmar",
      ru: "Аренда яхт и парусных лодок в Santorini Marina | Sharmar",
      me: "Najam jahti i jedrilica u Santorini Marina | Sharmar",
    },
    seoDescription:
      "Explore yacht charters, catamarans, sailing boats, and marina destinations in Santorini, Greece.",
    seoDescriptions: {
      en: "Explore yacht charters, catamarans, sailing boats, and marina destinations in Santorini, Greece.",
      ru: "Изучите яхтенные чартеры, катамараны, парусные лодки и марины на Санторини, Греция.",
      me: "Istražite yacht charter, katamarane, jedrilice i marine na Santoriniju, Grčka.",
    },
  },

  {
    slug: "corfu-marina",
    city: "Corfu",
    country: "Greece",
    region: "Ionian Sea",
    title: "Corfu Marina",
    description:
      "Explore yacht charters and marina destinations in Corfu for Ionian Sea sailing routes in Greece.",
    descriptions: {
      en: "Explore yacht charters and marina destinations in Corfu for Ionian Sea sailing routes in Greece.",
      ru: "Изучите яхтенные чартеры и марины Корфу для маршрутов по Ионическому морю в Греции.",
      me: "Istražite yacht charter i marine na Krfu za rute po Jonskom moru u Grčkoj.",
    },
    seoTitle:
      "Corfu Marina Yacht Rentals & Catamarans | Sharmar",
    seoTitles: {
      en: "Corfu Marina Yacht Rentals & Catamarans | Sharmar",
      ru: "Аренда яхт и катамаранов в Corfu Marina | Sharmar",
      me: "Najam jahti i katamarana u Corfu Marina | Sharmar",
    },
    seoDescription:
      "Explore yacht charters, catamarans, sailing boats, and marina destinations in Corfu, Greece.",
    seoDescriptions: {
      en: "Explore yacht charters, catamarans, sailing boats, and marina destinations in Corfu, Greece.",
      ru: "Изучите яхтенные чартеры, катамараны, парусные лодки и марины на Корфу, Греция.",
      me: "Istražite yacht charter, katamarane, jedrilice i marine na Krfu, Grčka.",
    },
  },

  {
    slug: "rhodes-marina",
    city: "Rhodes",
    country: "Greece",
    region: "Dodecanese",
    title: "Rhodes Marina",
    description:
      "Explore yacht charters and marina destinations in Rhodes for Dodecanese sailing routes in Greece.",
    descriptions: {
      en: "Explore yacht charters and marina destinations in Rhodes for Dodecanese sailing routes in Greece.",
      ru: "Изучите яхтенные чартеры и марины Родоса для маршрутов по Додеканесу в Греции.",
      me: "Istražite yacht charter i marine na Rodosu za rute kroz Dodekanez u Grčkoj.",
    },
    seoTitle:
      "Rhodes Marina Yacht Rentals & Sailing Boats | Sharmar",
    seoTitles: {
      en: "Rhodes Marina Yacht Rentals & Sailing Boats | Sharmar",
      ru: "Аренда яхт и парусных лодок в Rhodes Marina | Sharmar",
      me: "Najam jahti i jedrilica u Rhodes Marina | Sharmar",
    },
    seoDescription:
      "Explore yacht charters, catamarans, sailing boats, and marina destinations in Rhodes, Greece.",
    seoDescriptions: {
      en: "Explore yacht charters, catamarans, sailing boats, and marina destinations in Rhodes, Greece.",
      ru: "Изучите яхтенные чартеры, катамараны, парусные лодки и марины на Родосе, Греция.",
      me: "Istražite yacht charter, katamarane, jedrilice i marine na Rodosu, Grčka.",
    },
  },
];
