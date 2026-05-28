export const SITE_URL = "https://sharmar.me";

type ListItemInput = {
  name: string;
  url: string;
  item?: Record<string, unknown>;
};

export function absoluteSiteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function webPageJsonLd(input: {
  url: string;
  name: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: input.url,
    name: input.name,
    description: input.description,
  };
}

export function breadcrumbJsonLd(items: ListItemInput[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function itemListJsonLd(items: ListItemInput[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: item.url,
      name: item.name,
      ...(item.item ? { item: item.item } : {}),
    })),
  };
}
