"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/i18n";
import {
  ARCHIVE_SCHEMA_DECISION_REQUIRED,
  ADMIN_CRUD_ROUTES,
  OWNER_ACCOUNT_CREATION_DECISION_REQUIRED,
  REQUIRED_CONFIRMATION_PHRASES,
  type AdminCrudEntity,
  type AdminCrudAction,
} from "@/lib/adminCrudContracts";

type JsonRecord = Record<string, unknown>;

type Props = {
  lang: Lang;
  entity: AdminCrudEntity;
  dashboardRows: JsonRecord[];
  onRefresh: () => void | Promise<void>;
};

type PendingAction = {
  entity: AdminCrudEntity;
  action: AdminCrudAction;
  id: string;
  title: string;
  expectedUpdatedAt: string | null;
} | null;

const PAGE_SIZE = 10;

type CrudCopyShape = {
  search: string;
  filter: string;
  sort: string;
  page: string;
  next: string;
  previous: string;
  loading: string;
  empty: string;
  refresh: string;
  createOwner: string;
  editOwner: string;
  createBoat: string;
  editBoat: string;
  createRoute: string;
  editRoute: string;
  addDocument: string;
  replaceDocument: string;
  unlinkDocument: string;
  deleteDocument: string;
  uploadMedia: string;
  replaceMedia: string;
  unlinkMedia: string;
  deleteMedia: string;
  unpublish: string;
  archive: string;
  restore: string;
  deleteForever: string;
  dependencyCheck: string;
  deleteBlocked: string;
  bookingDependency: string;
  paymentDependency: string;
  dodoDependency: string;
  sharedMedia: string;
  confirmation: string;
  irreversible: string;
  saved: string;
  deleted: string;
  failed: string;
  stale: string;
  ownerDecision: string;
  archiveDecision: string;
  noRawJson: string;
  mediaPrivacy: string;
  fields: Record<string, string>;
  filters: Record<string, string>;
  statuses: Record<string, string>;
};

const copy = {
  ru: {
    search: "Поиск",
    filter: "Фильтр",
    sort: "Сортировка",
    page: "Страница",
    next: "Далее",
    previous: "Назад",
    loading: "Сохранение...",
    empty: "Данные ещё не загружены",
    refresh: "Обновить данные",
    createOwner: "Создать владельца",
    editOwner: "Редактировать владельца",
    createBoat: "Создать лодку",
    editBoat: "Редактировать лодку",
    createRoute: "Создать маршрут",
    editRoute: "Редактировать маршрут",
    addDocument: "Добавить документ",
    replaceDocument: "Заменить документ",
    unlinkDocument: "Отвязать документ",
    deleteDocument: "Удалить документ",
    uploadMedia: "Загрузить файл",
    replaceMedia: "Заменить связь",
    unlinkMedia: "Отвязать",
    deleteMedia: "Удалить неиспользуемый файл",
    unpublish: "Снять с публикации",
    archive: "Архивировать",
    restore: "Восстановить",
    deleteForever: "Удалить навсегда",
    dependencyCheck: "Проверка зависимостей",
    deleteBlocked: "Удаление невозможно",
    bookingDependency: "Есть связанные бронирования",
    paymentDependency: "Есть связанные платежи",
    dodoDependency: "Есть события платежного провайдера",
    sharedMedia: "Файл используется в других записях",
    confirmation: "Введите подтверждающую фразу",
    irreversible: "Действие необратимо. Сервер ещё раз проверит зависимости перед удалением.",
    saved: "Изменения сохранены",
    deleted: "Данные удалены",
    failed: "Не удалось выполнить действие",
    stale: "Запись изменилась. Обновите данные и повторите действие.",
    ownerDecision: "Для безопасного создания владельца нужен утверждённый процесс приглашения или обязательная смена временного пароля.",
    archiveDecision: "Для архивации этой сущности нужно отдельное продуктовое правило. Скрытое удаление или переиспользование статуса не выполняется.",
    noRawJson: "Технические сведения скрыты",
    mediaPrivacy: "Документы владельцев доступны только в разделе «Документы».",
    filters: {
      all: "Все",
      submitted: "Ожидает проверки",
      under_review: "На проверке",
      approved: "Подтверждено",
      published: "Опубликовано",
      rejected: "Отклонено",
      updated: "По дате изменения",
      title: "По названию",
    },
    statuses: {
      draft: "Черновик",
      submitted: "Ожидает проверки",
      under_review: "На проверке",
      needs_changes: "Требует доработки",
      approved: "Подтверждено",
      published: "Опубликовано",
      rejected: "Отклонено",
      archived: "Архивировано",
      blocked: "Заблокировано",
    },
    fields: {
      owner: "Владелец",
      status: "Статус",
      documents: "Документы",
      boats: "Лодки",
      routes: "Маршруты",
      media: "Медиа",
      updated: "Обновлено",
      publicUrl: "Публичная ссылка",
      usage: "Использование",
    },
  },
  en: {
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    page: "Page",
    next: "Next",
    previous: "Back",
    loading: "Saving...",
    empty: "No data loaded yet",
    refresh: "Refresh data",
    createOwner: "Create owner",
    editOwner: "Edit owner",
    createBoat: "Create boat",
    editBoat: "Edit boat",
    createRoute: "Create route",
    editRoute: "Edit route",
    addDocument: "Add document",
    replaceDocument: "Replace document",
    unlinkDocument: "Unlink document",
    deleteDocument: "Delete document",
    uploadMedia: "Upload file",
    replaceMedia: "Replace link",
    unlinkMedia: "Unlink",
    deleteMedia: "Delete unused file",
    unpublish: "Unpublish",
    archive: "Archive",
    restore: "Restore",
    deleteForever: "Delete permanently",
    dependencyCheck: "Dependency check",
    deleteBlocked: "Deletion is blocked",
    bookingDependency: "Linked bookings exist",
    paymentDependency: "Linked payments exist",
    dodoDependency: "Payment provider events exist",
    sharedMedia: "File is used by other records",
    confirmation: "Enter the confirmation phrase",
    irreversible: "This action cannot be undone. The server will recheck dependencies before deleting.",
    saved: "Changes saved",
    deleted: "Data deleted",
    failed: "Action failed",
    stale: "The record changed. Refresh data and try again.",
    ownerDecision: "Safe owner creation needs an approved invite flow or mandatory temporary password change.",
    archiveDecision: "Archiving this entity needs a dedicated product contract. Hidden deletion or status reuse is not performed.",
    noRawJson: "Technical details are hidden",
    mediaPrivacy: "Owner documents are available only in the Documents section.",
    filters: {
      all: "All",
      submitted: "Awaiting review",
      under_review: "Under review",
      approved: "Approved",
      published: "Published",
      rejected: "Rejected",
      updated: "By update date",
      title: "By title",
    },
    statuses: {
      draft: "Draft",
      submitted: "Awaiting review",
      under_review: "Under review",
      needs_changes: "Needs changes",
      approved: "Approved",
      published: "Published",
      rejected: "Rejected",
      archived: "Archived",
      blocked: "Blocked",
    },
    fields: {
      owner: "Owner",
      status: "Status",
      documents: "Documents",
      boats: "Boats",
      routes: "Routes",
      media: "Media",
      updated: "Updated",
      publicUrl: "Public URL",
      usage: "Usage",
    },
  },
  me: {
    search: "Pretraga",
    filter: "Filter",
    sort: "Sortiranje",
    page: "Strana",
    next: "Dalje",
    previous: "Nazad",
    loading: "Čuvanje...",
    empty: "Podaci još nijesu učitani",
    refresh: "Osvježi podatke",
    createOwner: "Kreiraj vlasnika",
    editOwner: "Uredi vlasnika",
    createBoat: "Kreiraj plovilo",
    editBoat: "Uredi plovilo",
    createRoute: "Kreiraj rutu",
    editRoute: "Uredi rutu",
    addDocument: "Dodaj dokument",
    replaceDocument: "Zamijeni dokument",
    unlinkDocument: "Odveži dokument",
    deleteDocument: "Obriši dokument",
    uploadMedia: "Otpremi fajl",
    replaceMedia: "Zamijeni vezu",
    unlinkMedia: "Odveži",
    deleteMedia: "Obriši nekorišćen fajl",
    unpublish: "Povuci iz objave",
    archive: "Arhiviraj",
    restore: "Vrati",
    deleteForever: "Trajno obriši",
    dependencyCheck: "Provjera zavisnosti",
    deleteBlocked: "Brisanje nije moguće",
    bookingDependency: "Postoje povezana bukiranja",
    paymentDependency: "Postoje povezana plaćanja",
    dodoDependency: "Postoje događaji platnog provajdera",
    sharedMedia: "Fajl se koristi u drugim zapisima",
    confirmation: "Unesite frazu za potvrdu",
    irreversible: "Radnja se ne može poništiti. Server će ponovo provjeriti zavisnosti prije brisanja.",
    saved: "Izmjene su sačuvane",
    deleted: "Podaci su obrisani",
    failed: "Radnja nije uspjela",
    stale: "Zapis je promijenjen. Osvježite podatke i pokušajte ponovo.",
    ownerDecision: "Za sigurno kreiranje vlasnika potreban je odobren invite-flow ili obavezna promjena privremene lozinke.",
    archiveDecision: "Arhiviranje ove stavke traži poseban proizvodni contract. Skriveno brisanje ili ponovno korišćenje statusa se ne radi.",
    noRawJson: "Tehnički detalji su sakriveni",
    mediaPrivacy: "Dokumenti vlasnika dostupni su samo u odjeljku Dokumenti.",
    filters: {
      all: "Sve",
      submitted: "Čeka provjeru",
      under_review: "U provjeri",
      approved: "Potvrđeno",
      published: "Objavljeno",
      rejected: "Odbijeno",
      updated: "Po datumu izmjene",
      title: "Po nazivu",
    },
    statuses: {
      draft: "Nacrt",
      submitted: "Čeka provjeru",
      under_review: "U provjeri",
      needs_changes: "Potrebna dorada",
      approved: "Potvrđeno",
      published: "Objavljeno",
      rejected: "Odbijeno",
      archived: "Arhivirano",
      blocked: "Blokirano",
    },
    fields: {
      owner: "Vlasnik",
      status: "Status",
      documents: "Dokumenti",
      boats: "Plovila",
      routes: "Rute",
      media: "Mediji",
      updated: "Ažurirano",
      publicUrl: "Javna veza",
      usage: "Korišćenje",
    },
  },
} satisfies Record<Lang, CrudCopyShape>;

function asText(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function rowId(entity: AdminCrudEntity, row: JsonRecord): string {
  if (entity === "owner") return String(row.profile_id ?? row.id ?? "");
  if (entity === "document" || entity === "media") return String(row.id ?? "");
  return asText(row.documentId) || String(row.id ?? "");
}

function rowTitle(entity: AdminCrudEntity, row: JsonRecord, lang: Lang): string {
  if (entity === "owner") return asText(row.display_name) || asText(row.username) || asText(row.email) || copy[lang].fields.owner;
  if (entity === "document") return asText(row.field) || asText(row.name) || copy[lang].fields.documents;
  if (entity === "media") return asText(row.name) || copy[lang].fields.media;
  return asText(row.title) || rowId(entity, row);
}

function formatDate(value: unknown, lang: Lang): string {
  const raw = asText(value);
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const locale = lang === "ru" ? "ru-RU" : lang === "me" ? "sr-Latn-ME" : "en-GB";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(value: unknown, lang: Lang): string {
  const key = asText(value);
  const statuses: Record<string, string> = copy[lang].statuses;
  return key ? statuses[key] ?? key : "—";
}

function rowSearchText(row: JsonRecord): string {
  return Object.values(row)
    .filter((value) => ["string", "number", "boolean"].includes(typeof value))
    .join(" ")
    .toLowerCase();
}

type CrudCopy = (typeof copy)[Lang];

function actionLabel(ui: CrudCopy, entity: AdminCrudEntity, action: AdminCrudAction): string {
  if (entity === "owner" && action === "create") return ui.createOwner as string;
  if (entity === "owner" && action === "update") return ui.editOwner as string;
  if (entity === "document" && action === "create") return ui.addDocument as string;
  if (entity === "document" && action === "update") return ui.replaceDocument as string;
  if (entity === "document" && action === "unlink_document") return ui.unlinkDocument as string;
  if (entity === "document" && action === "delete") return ui.deleteDocument as string;
  if (entity === "boat" && action === "create") return ui.createBoat as string;
  if (entity === "boat" && action === "update") return ui.editBoat as string;
  if (entity === "experience" && action === "create") return ui.createRoute as string;
  if (entity === "experience" && action === "update") return ui.editRoute as string;
  if (entity === "media" && action === "create") return ui.uploadMedia as string;
  if (entity === "media" && action === "update") return ui.replaceMedia as string;
  if (entity === "media" && action === "delete") return ui.deleteMedia as string;
  if (action === "unpublish") return ui.unpublish as string;
  if (action === "archive") return ui.archive as string;
  if (action === "restore") return ui.restore as string;
  return ui.deleteForever as string;
}

export default function AdminCrudManager({ lang, entity, dashboardRows, onRefresh }: Props) {
  const ui = copy[lang];
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("updated");
  const [page, setPage] = useState(1);
  const [remoteRows, setRemoteRows] = useState<JsonRecord[] | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (entity !== "media") return;
    let cancelled = false;
    void fetch(ADMIN_CRUD_ROUTES.media, { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled && json && typeof json === "object" && Array.isArray(json.rows)) {
          setRemoteRows(json.rows.filter((item: unknown): item is JsonRecord => typeof item === "object" && item !== null));
        }
      })
      .catch(() => {
        if (!cancelled) setRemoteRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [entity]);

  const rows = useMemo(
    () => (entity === "media" ? remoteRows ?? [] : dashboardRows),
    [dashboardRows, entity, remoteRows]
  );
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows
      .filter((row) => (needle ? rowSearchText(row).includes(needle) : true))
      .filter((row) => filter === "all" || asText(row.moderation_status ?? row.verification_status ?? row.state) === filter)
      .sort((left, right) => {
        if (sort === "title") return rowTitle(entity, left, lang).localeCompare(rowTitle(entity, right, lang));
        return String(right.updated_at ?? right.updatedAt ?? "").localeCompare(String(left.updated_at ?? left.updatedAt ?? ""));
      });
  }, [entity, filter, lang, rows, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openAction(row: JsonRecord, action: AdminCrudAction) {
    setMessage(null);
    setConfirmation("");
    setPending({
      entity,
      action,
      id: rowId(entity, row),
      title: rowTitle(entity, row, lang),
      expectedUpdatedAt: asText(row.updated_at ?? row.updatedAt),
    });
  }

  async function runPendingAction() {
    if (!pending) return;
    setSaving(true);
    setMessage(null);
    try {
      const route = `${ADMIN_CRUD_ROUTES[pending.entity]}/${encodeURIComponent(pending.id)}`;
      const method = pending.action === "delete" ? "DELETE" : "PATCH";
      const response = await fetch(route, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pending.action,
          fields: {},
          expectedUpdatedAt: pending.expectedUpdatedAt,
          confirmationPhrase: confirmation,
          idempotencyKey: `${pending.entity}:${pending.action}:${pending.id}`,
        }),
      });
      const json = await response.json().catch(() => null) as { code?: string } | null;
      if (!response.ok) {
        setMessage(json?.code === "stale_version" ? ui.stale : ui.failed);
        return;
      }
      setMessage(pending.action === "delete" ? ui.deleted : ui.saved);
      setPending(null);
      await onRefresh();
    } catch {
      setMessage(ui.failed);
    } finally {
      setSaving(false);
    }
  }

  const deletePhrase = pending ? REQUIRED_CONFIRMATION_PHRASES[pending.entity] : "";
  const canConfirm = !pending || pending.action !== "delete" || confirmation === deletePhrase;
  const filters = ui.filters as Record<string, string>;

  return (
    <section className="admin-crud-panel">
      <div className="crud-toolbar">
        <label>
          <span>{ui.search}</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </label>
        <label>
          <span>{ui.filter}</span>
          <select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}>
            <option value="all">{filters.all}</option>
            <option value="submitted">{filters.submitted}</option>
            <option value="under_review">{filters.under_review}</option>
            <option value="approved">{filters.approved}</option>
            <option value="published">{filters.published}</option>
            <option value="rejected">{filters.rejected}</option>
          </select>
        </label>
        <label>
          <span>{ui.sort}</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="updated">{filters.updated}</option>
            <option value="title">{filters.title}</option>
          </select>
        </label>
        <button type="button" onClick={() => void onRefresh()}>{ui.refresh}</button>
      </div>

      {OWNER_ACCOUNT_CREATION_DECISION_REQUIRED && entity === "owner" ? <p className="admin-warning">{ui.ownerDecision}</p> : null}
      {ARCHIVE_SCHEMA_DECISION_REQUIRED && (entity === "owner" || entity === "document" || entity === "media") ? <p className="admin-warning">{ui.archiveDecision}</p> : null}
      {entity === "media" ? <p className="admin-muted">{ui.mediaPrivacy}</p> : null}

      <div className="crud-actions-row">
        <button type="button" disabled={entity === "owner"}>{actionLabel(ui, entity, "create")}</button>
      </div>

      <div className="admin-list">
        {visibleRows.map((row) => {
          const id = rowId(entity, row);
          return (
            <article className="admin-card" key={`${entity}-${id}`}>
              <div className="admin-row">
                <div>
                  <h2>{rowTitle(entity, row, lang)}</h2>
                <p>{ui.fields.status}: {statusLabel(row.moderation_status ?? row.verification_status ?? row.state, lang)}</p>
                </div>
                <span>{formatDate(row.updated_at ?? row.updatedAt, lang)}</span>
              </div>
              <dl className="admin-fields">
                <div><dt>{ui.fields.owner}</dt><dd>{asText(row.owner_display_name ?? row.owner_email) || "—"}</dd></div>
                <div><dt>{ui.fields.documents}</dt><dd>{asNumber(row.document_count) ?? "—"}</dd></div>
                <div><dt>{ui.fields.routes}</dt><dd>{asNumber(row.experiences_count) ?? "—"}</dd></div>
                <div><dt>{ui.fields.media}</dt><dd>{asNumber(row.images_count ?? row.gallery_count ?? row.cover_count) ?? "—"}</dd></div>
              </dl>
              <details>
                <summary>{ui.dependencyCheck}</summary>
                <p>{ui.noRawJson}</p>
                <p>{ui.bookingDependency} · {ui.paymentDependency} · {ui.dodoDependency}</p>
                <p>{ui.sharedMedia}</p>
              </details>
              <div className="crud-row-actions">
                <button type="button" onClick={() => openAction(row, "update")}>{actionLabel(ui, entity, "update")}</button>
                {(entity === "boat" || entity === "experience") ? (
                  <>
                    <button type="button" onClick={() => openAction(row, "unpublish")}>{ui.unpublish}</button>
                    <button type="button" onClick={() => openAction(row, "archive")}>{ui.archive}</button>
                  </>
                ) : null}
                {entity === "document" ? (
                  <>
                    <button type="button" onClick={() => openAction(row, "replace_document")}>{ui.replaceDocument}</button>
                    <button type="button" onClick={() => openAction(row, "unlink_document")}>{ui.unlinkDocument}</button>
                  </>
                ) : null}
                <button type="button" className="danger" onClick={() => openAction(row, "delete")}>{ui.deleteForever as string}</button>
              </div>
            </article>
          );
        })}
        {!visibleRows.length ? <p className="admin-muted">{ui.empty}</p> : null}
      </div>

      <div className="pagination">
        <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{ui.previous}</button>
        <span>{ui.page} {page}/{totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>{ui.next}</button>
      </div>

      {pending ? (
        <div className="crud-dialog" role="dialog" aria-modal="true" aria-label={actionLabel(ui, pending.entity, pending.action)}>
          <h2>{actionLabel(ui, pending.entity, pending.action)}</h2>
          <p>{pending.title}</p>
          <p>{ui.irreversible}</p>
          {pending.action === "delete" ? (
            <label>
              <span>{ui.confirmation}</span>
              <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </label>
          ) : null}
          <div className="crud-row-actions">
            <button type="button" onClick={() => setPending(null)}>{ui.previous}</button>
            <button type="button" disabled={!canConfirm || saving} onClick={() => void runPendingAction()}>
              {saving ? ui.loading : actionLabel(ui, pending.entity, pending.action)}
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="admin-warning" role="status">{message}</p> : null}

      <style jsx>{`
        .admin-crud-panel {
          display: grid;
          gap: 12px;
        }
        .crud-toolbar,
        .crud-actions-row,
        .crud-row-actions,
        .pagination {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: end;
        }
        .crud-toolbar label,
        .crud-dialog label {
          display: grid;
          gap: 5px;
        }
        select {
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: white;
          font: inherit;
          padding: 10px 12px;
        }
        .danger {
          background: #ffd3d3;
        }
        .crud-dialog {
          position: fixed;
          inset: auto 24px 24px auto;
          width: min(420px, calc(100vw - 48px));
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: #10141b;
          padding: 18px;
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.35);
          z-index: 10;
        }
      `}</style>
    </section>
  );
}
