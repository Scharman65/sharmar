"use client";

import { useMemo, useState } from "react";
import type { Lang } from "@/i18n";

type EntityType = "boat" | "experience" | "owner_profile";

type Props = {
  lang?: Lang;
  adminToken?: string;
  entityType: EntityType;
  documentId?: string | null;
  profileId?: number | null;
  status?: string | null;
  onComplete?: () => void | Promise<void>;
};

type ActionDefinition = {
  id: string;
  needsComment?: boolean;
  dangerous?: boolean;
};

const BOAT_ACTIONS: Record<string, ActionDefinition[]> = {
  submitted: [
    { id: "start_review" },
    {
      id: "reject",
      needsComment: true,
      dangerous: true,
    },
  ],
  under_review: [
    {
      id: "request_changes",
      needsComment: true,
    },
    {
      id: "reject",
      needsComment: true,
      dangerous: true,
    },
    { id: "approve" },
  ],
  needs_changes: [
    {
      id: "reject",
      needsComment: true,
      dangerous: true,
    },
  ],
  approved: [
    {
      id: "publish",
      dangerous: true,
    },
    {
      id: "archive",
      dangerous: true,
    },
  ],
  published: [
    {
      id: "unpublish",
      dangerous: true,
    },
    {
      id: "archive",
      dangerous: true,
    },
  ],
  rejected: [
    {
      id: "archive",
      dangerous: true,
    },
  ],
};

const EXPERIENCE_ACTIONS: Record<string, ActionDefinition[]> = {
  submitted: [
    { id: "start_review" },
    {
      id: "reject",
      needsComment: true,
      dangerous: true,
    },
  ],
  under_review: [
    {
      id: "request_changes",
      needsComment: true,
    },
    {
      id: "reject",
      needsComment: true,
      dangerous: true,
    },
    { id: "approve" },
  ],
  needs_changes: [
    { id: "start_review" },
    {
      id: "reject",
      needsComment: true,
      dangerous: true,
    },
  ],
  approved: [
    {
      id: "publish",
      dangerous: true,
    },
    {
      id: "archive",
      dangerous: true,
    },
  ],
  published: [
    {
      id: "unpublish",
      dangerous: true,
    },
    {
      id: "archive",
      dangerous: true,
    },
  ],
  rejected: [
    { id: "start_review" },
    {
      id: "archive",
      dangerous: true,
    },
  ],
};

const OWNER_ACTIONS: Record<string, ActionDefinition[]> = {
  documents_uploaded: [
    { id: "start_review" },
    {
      id: "reject",
      needsComment: true,
      dangerous: true,
    },
  ],
  under_review: [
    {
      id: "request_changes",
      needsComment: true,
    },
    {
      id: "reject",
      needsComment: true,
      dangerous: true,
    },
    { id: "approve" },
    {
      id: "block",
      needsComment: true,
      dangerous: true,
    },
  ],
  rejected: [
    { id: "start_review" },
    {
      id: "block",
      needsComment: true,
      dangerous: true,
    },
  ],
  approved: [
    {
      id: "block",
      needsComment: true,
      dangerous: true,
    },
  ],
};

const copy = {
  ru: {
    actions: {
      start_review: "Начать проверку",
      reject: "Отклонить",
      request_changes: "Запросить повторную загрузку",
      approve: "Подтвердить",
      publish: "Опубликовать",
      archive: "Архивировать",
      unpublish: "Снять с публикации",
      block: "Заблокировать",
    },
    experienceActions: {
      start_review: "Отправить на дополнительную проверку",
      reject: "Отклонить маршрут",
      request_changes: "Вернуть на доработку",
      approve: "Подтвердить маршрут",
      publish: "Опубликовать маршрут",
      archive: "Архивировать маршрут",
      unpublish: "Снять маршрут с публикации",
    },
    current: "Текущий статус",
    comment: "Комментарий администратора",
    commentPlaceholder: "Обязателен для отклонения, блокировки или запроса изменений",
    enterComment: "Сначала добавьте комментарий.",
    confirm: "Подтвердить действие",
    saving: "Сохранение...",
    saved: "Действие выполнено. Новый статус",
    noActions: "Для этого статуса нет доступных действий.",
    reachError: "Не удалось выполнить действие",
    errors: {
      unauthorized: "Сессия администратора недействительна.",
      admin_cookie_missing: "Cookie сессии администратора отсутствует. Войдите снова.",
      invalid_admin_session: "Сессия администратора недействительна. Войдите снова.",
      session_expired: "Сессия администратора истекла. Войдите снова.",
      admin_session_unavailable: "Сессии администратора недоступны: на сервере не настроен ADMIN_SESSION_SECRET.",
      missing_moderation_permission: "У этой сессии нет права на модерацию.",
      write_not_enabled: "Действия модерации выключены на сервере.",
      csrf_check_failed: "Проверка безопасности запроса не пройдена.",
      transition_not_allowed: "Этот переход статуса недоступен.",
      comment_required: "Нужен комментарий администратора.",
      owner_not_approved: "Сначала нужно подтвердить владельца.",
      owner_document_required: "Нужен хотя бы один документ владельца.",
      boat_media_required: "Перед публикацией нужна хотя бы одна фотография лодки.",
      required_locales_missing: "Для публикации нужны версии RU, EN и ME.",
      required_locales_incomplete: "В каждой версии должны быть заголовок и slug.",
      boat_owner_missing: "У лодки не найден владелец.",
      boat_not_found: "Лодка не найдена.",
      owner_profile_not_found: "Профиль владельца не найден.",
      experience_not_found: "Маршрут не найден.",
      experience_boat_required: "Маршрут не связан с лодкой.",
      linked_boat_not_published: "Сначала нужно опубликовать связанную лодку.",
      experience_not_approved: "Сначала нужно подтвердить маршрут.",
    },
  },
  en: {
    actions: {
      start_review: "Start review",
      reject: "Reject",
      request_changes: "Request changes",
      approve: "Approve",
      publish: "Publish",
      archive: "Archive",
      unpublish: "Unpublish",
      block: "Block",
    },
    experienceActions: {
      start_review: "Send for extra review",
      reject: "Reject route",
      request_changes: "Return for changes",
      approve: "Approve route",
      publish: "Publish route",
      archive: "Archive route",
      unpublish: "Unpublish route",
    },
    current: "Current status",
    comment: "Admin comment",
    commentPlaceholder: "Required for rejection, blocking, or change requests",
    enterComment: "Enter a comment first.",
    confirm: "Confirm action",
    saving: "Saving...",
    saved: "Saved. New status",
    noActions: "No action is available for this status.",
    reachError: "Could not complete the action.",
    errors: {
      unauthorized: "Admin session is invalid.",
      admin_cookie_missing: "The admin session cookie is missing. Sign in again.",
      invalid_admin_session: "The admin session is invalid. Sign in again.",
      session_expired: "The admin session has expired. Sign in again.",
      admin_session_unavailable: "Admin sessions are unavailable because ADMIN_SESSION_SECRET is not configured on the server.",
      missing_moderation_permission: "This session does not have moderation access.",
      write_not_enabled: "Moderation actions are disabled on the server.",
      csrf_check_failed: "Request security check failed.",
      transition_not_allowed: "This status transition is not available.",
      comment_required: "Admin comment is required.",
      owner_not_approved: "Approve the owner first.",
      owner_document_required: "At least one owner document is required.",
      boat_media_required: "At least one boat photo is required before publication.",
      required_locales_missing: "RU, EN and ME versions are required before publication.",
      required_locales_incomplete: "Each version needs a title and slug.",
      boat_owner_missing: "Boat owner is missing.",
      boat_not_found: "Boat not found.",
      owner_profile_not_found: "Owner profile not found.",
      experience_not_found: "Route not found.",
      experience_boat_required: "Route is not linked to a boat.",
      linked_boat_not_published: "Publish the linked boat first.",
      experience_not_approved: "Approve the route first.",
    },
  },
  me: {
    actions: {
      start_review: "Započni provjeru",
      reject: "Odbij",
      request_changes: "Zatraži izmjene",
      approve: "Potvrdi",
      publish: "Objavi",
      archive: "Arhiviraj",
      unpublish: "Povuci objavu",
      block: "Blokiraj",
    },
    experienceActions: {
      start_review: "Pošalji na dodatnu provjeru",
      reject: "Odbij rutu",
      request_changes: "Vrati na doradu",
      approve: "Potvrdi rutu",
      publish: "Objavi rutu",
      archive: "Arhiviraj rutu",
      unpublish: "Povuci objavu rute",
    },
    current: "Trenutni status",
    comment: "Komentar administratora",
    commentPlaceholder: "Obavezno za odbijanje, blokiranje ili zahtjev za izmjene",
    enterComment: "Prvo unesite komentar.",
    confirm: "Potvrdite radnju",
    saving: "Čuvanje...",
    saved: "Sačuvano. Novi status",
    noActions: "Za ovaj status nema dostupnih radnji.",
    reachError: "Radnja nije izvršena.",
    errors: {
      unauthorized: "Administratorska sesija nije važeća.",
      admin_cookie_missing: "Cookie administratorske sesije nedostaje. Prijavite se ponovo.",
      invalid_admin_session: "Administratorska sesija nije važeća. Prijavite se ponovo.",
      session_expired: "Administratorska sesija je istekla. Prijavite se ponovo.",
      admin_session_unavailable: "Administratorske sesije nijesu dostupne jer ADMIN_SESSION_SECRET nije podešen na serveru.",
      missing_moderation_permission: "Ova sesija nema pravo na moderaciju.",
      write_not_enabled: "Moderacijske radnje su isključene na serveru.",
      csrf_check_failed: "Sigurnosna provjera zahtjeva nije prošla.",
      transition_not_allowed: "Ova promjena statusa nije dostupna.",
      comment_required: "Potreban je komentar administratora.",
      owner_not_approved: "Prvo potvrdite vlasnika.",
      owner_document_required: "Potreban je bar jedan dokument vlasnika.",
      boat_media_required: "Prije objave potrebna je bar jedna fotografija plovila.",
      required_locales_missing: "Za objavu su potrebne RU, EN i ME verzije.",
      required_locales_incomplete: "Svaka verzija mora imati naslov i slug.",
      boat_owner_missing: "Vlasnik plovila nije povezan.",
      boat_not_found: "Plovilo nije pronađeno.",
      owner_profile_not_found: "Profil vlasnika nije pronađen.",
      experience_not_found: "Ruta nije pronađena.",
      experience_boat_required: "Ruta nije povezana sa plovilom.",
      linked_boat_not_published: "Prvo objavite povezano plovilo.",
      experience_not_approved: "Prvo potvrdite rutu.",
    },
  },
} satisfies Record<Lang, {
  actions: Record<string, string>;
  experienceActions: Record<string, string>;
  current: string;
  comment: string;
  commentPlaceholder: string;
  enterComment: string;
  confirm: string;
  saving: string;
  saved: string;
  noActions: string;
  reachError: string;
  errors: Record<string, string>;
}>;

function errorMessage(lang: Lang, code: string | undefined): string {
  const ui = copy[lang];
  const errors: Record<string, string> = ui.errors;
  return code
    ? errors[code] || `${ui.reachError} (${code}).`
    : ui.reachError;
}

export default function AdminModerationActions({
  lang = "en",
  entityType,
  documentId,
  profileId,
  status,
  onComplete,
}: Props) {
  const ui = copy[lang];
  const actionLabels: Record<string, string> =
    entityType === "experience" ? ui.experienceActions : ui.actions;
  const [comment, setComment] = useState("");
  const [pendingAction, setPendingAction] =
    useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = useMemo(() => {
    const normalized = status || "";

    if (entityType === "boat") return BOAT_ACTIONS[normalized] || [];
    if (entityType === "experience") return EXPERIENCE_ACTIONS[normalized] || [];
    return OWNER_ACTIONS[normalized] || [];
  }, [entityType, status]);

  async function runAction(action: ActionDefinition) {
    setMessage(null);
    setError(null);

    if (action.needsComment && !comment.trim()) {
      setError(ui.enterComment);
      return;
    }

    if (
      action.dangerous &&
      !window.confirm(
        `${ui.confirm}: ${actionLabels[action.id] ?? action.id}?`
      )
    ) {
      return;
    }

    setPendingAction(action.id);

    try {
      const response = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          entityType,
          documentId:
            entityType === "boat" || entityType === "experience"
              ? documentId
              : undefined,
          profileId:
            entityType === "owner_profile"
              ? profileId
              : undefined,
          action: action.id,
          comment: comment.trim() || undefined,
        }),
      });

      const json: {
        ok?: boolean;
        code?: string;
        moderationStatus?: string;
        verificationStatus?: string;
      } = await response
        .json()
        .catch(() => ({ ok: false, code: "invalid_response" }));

      if (!response.ok || json.ok !== true) {
        setError(errorMessage(lang, json.code));
        return;
      }

      setComment("");
      setMessage(
        `${ui.saved}: ${
          json.moderationStatus ||
          json.verificationStatus ||
          "updated"
        }.`
      );

      await onComplete?.();
    } catch {
      setError(ui.reachError);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="admin-moderation-actions">
      <div className="admin-moderation-current">
        {ui.current}: <strong>{status || "-"}</strong>
      </div>

      {actions.some((action) => action.needsComment) ? (
        <label className="admin-moderation-comment">
          <span>{ui.comment}</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={4000}
            rows={4}
            placeholder={ui.commentPlaceholder}
          />
        </label>
      ) : null}

      {actions.length ? (
        <div className="admin-moderation-buttons">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={pendingAction !== null}
              onClick={() => void runAction(action)}
            >
              {pendingAction === action.id
                ? ui.saving
                : actionLabels[action.id] ?? action.id}
            </button>
          ))}
        </div>
      ) : (
        <p className="admin-moderation-empty">
          {ui.noActions}
        </p>
      )}

      {message ? (
        <p className="admin-moderation-success">{message}</p>
      ) : null}

      {error ? (
        <p className="admin-moderation-error" role="alert">
          {error}
        </p>
      ) : null}

      <style jsx>{`
        .admin-moderation-actions {
          display: grid;
          gap: 12px;
        }

        .admin-moderation-current {
          color: rgba(255, 255, 255, 0.78);
          font-size: 13px;
        }

        .admin-moderation-comment {
          display: grid;
          gap: 7px;
          color: rgba(255, 255, 255, 0.68);
          font-size: 13px;
        }

        .admin-moderation-comment textarea {
          width: 100%;
          resize: vertical;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.22);
          color: white;
          padding: 11px 12px;
          font: inherit;
        }

        .admin-moderation-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .admin-moderation-buttons button {
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: white;
          color: #111;
          padding: 9px 12px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .admin-moderation-buttons button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .admin-moderation-success,
        .admin-moderation-error,
        .admin-moderation-empty {
          margin: 0;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
        }

        .admin-moderation-success {
          border: 1px solid rgba(101, 255, 146, 0.28);
          background: rgba(101, 255, 146, 0.08);
          color: #baf7c9;
        }

        .admin-moderation-error {
          border: 1px solid rgba(255, 198, 92, 0.32);
          background: rgba(255, 174, 54, 0.1);
          color: #ffe4ac;
        }

        .admin-moderation-empty {
          color: rgba(255, 255, 255, 0.64);
          background: rgba(255, 255, 255, 0.04);
        }
      `}</style>
    </div>
  );
}
