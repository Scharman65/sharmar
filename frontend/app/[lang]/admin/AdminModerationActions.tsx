"use client";

import { useMemo, useState } from "react";

type EntityType = "boat" | "owner_profile";

type Props = {
  adminToken: string;
  entityType: EntityType;
  documentId?: string | null;
  profileId?: number | null;
  status?: string | null;
  onComplete?: () => void | Promise<void>;
};

type ActionDefinition = {
  id: string;
  label: string;
  needsComment?: boolean;
  dangerous?: boolean;
};

const BOAT_ACTIONS: Record<string, ActionDefinition[]> = {
  submitted: [
    { id: "start_review", label: "Start review" },
    {
      id: "reject",
      label: "Reject",
      needsComment: true,
      dangerous: true,
    },
  ],
  under_review: [
    {
      id: "request_changes",
      label: "Request changes",
      needsComment: true,
    },
    {
      id: "reject",
      label: "Reject",
      needsComment: true,
      dangerous: true,
    },
    { id: "approve", label: "Approve" },
  ],
  needs_changes: [
    {
      id: "reject",
      label: "Reject",
      needsComment: true,
      dangerous: true,
    },
  ],
  approved: [
    {
      id: "publish",
      label: "Publish all locales",
      dangerous: true,
    },
    {
      id: "archive",
      label: "Archive",
      dangerous: true,
    },
  ],
  published: [
    {
      id: "unpublish",
      label: "Unpublish all locales",
      dangerous: true,
    },
    {
      id: "archive",
      label: "Archive",
      dangerous: true,
    },
  ],
  rejected: [
    {
      id: "archive",
      label: "Archive",
      dangerous: true,
    },
  ],
};

const OWNER_ACTIONS: Record<string, ActionDefinition[]> = {
  documents_uploaded: [
    { id: "start_review", label: "Start document review" },
    {
      id: "reject",
      label: "Reject documents",
      needsComment: true,
      dangerous: true,
    },
  ],
  under_review: [
    {
      id: "request_changes",
      label: "Request new documents",
      needsComment: true,
    },
    {
      id: "reject",
      label: "Reject owner",
      needsComment: true,
      dangerous: true,
    },
    { id: "approve", label: "Approve owner" },
    {
      id: "block",
      label: "Block owner",
      needsComment: true,
      dangerous: true,
    },
  ],
  rejected: [
    { id: "start_review", label: "Reopen document review" },
    {
      id: "block",
      label: "Block owner",
      needsComment: true,
      dangerous: true,
    },
  ],
  approved: [
    {
      id: "block",
      label: "Block owner",
      needsComment: true,
      dangerous: true,
    },
  ],
};

function errorMessage(code: string | undefined): string {
  const messages: Record<string, string> = {
    unauthorized: "Admin token is invalid.",
    write_not_enabled:
      "Moderation writes are disabled on the server.",
    admin_moderation_token_missing:
      "Public moderation token is not configured.",
    admin_moderation_internal_token_missing:
      "Internal moderation token is not configured.",
    transition_not_allowed:
      "This status transition is not allowed.",
    comment_required:
      "A moderation comment is required.",
    owner_not_approved:
      "The boat owner must be approved before approval or publication.",
    owner_document_required:
      "At least one owner document is required.",
    boat_media_required:
      "At least one boat image is required before publication.",
    required_locales_missing:
      "RU, EN and ME boat versions are required before publication.",
    required_locales_incomplete:
      "Each required locale needs a title and slug.",
    boat_owner_missing:
      "The boat does not have a linked owner.",
    boat_not_found:
      "Boat not found.",
    owner_profile_not_found:
      "Owner profile not found.",
  };

  return code
    ? messages[code] || `Moderation failed (${code}).`
    : "Moderation failed.";
}

export default function AdminModerationActions({
  adminToken,
  entityType,
  documentId,
  profileId,
  status,
  onComplete,
}: Props) {
  const [comment, setComment] = useState("");
  const [pendingAction, setPendingAction] =
    useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = useMemo(() => {
    const normalized = status || "";

    return entityType === "boat"
      ? BOAT_ACTIONS[normalized] || []
      : OWNER_ACTIONS[normalized] || [];
  }, [entityType, status]);

  async function runAction(action: ActionDefinition) {
    setMessage(null);
    setError(null);

    if (action.needsComment && !comment.trim()) {
      setError("Enter a moderation comment first.");
      return;
    }

    if (
      action.dangerous &&
      !window.confirm(
        `Confirm moderation action: ${action.label}?`
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
          "x-admin-token": adminToken,
        },
        cache: "no-store",
        body: JSON.stringify({
          entityType,
          documentId:
            entityType === "boat" ? documentId : undefined,
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
        setError(errorMessage(json.code));
        return;
      }

      setComment("");
      setMessage(
        `Saved. New status: ${
          json.moderationStatus ||
          json.verificationStatus ||
          "updated"
        }.`
      );

      await onComplete?.();
    } catch {
      setError("Could not reach the moderation API.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="admin-moderation-actions">
      <div className="admin-moderation-current">
        Current status: <strong>{status || "unknown"}</strong>
      </div>

      {actions.some((action) => action.needsComment) ? (
        <label className="admin-moderation-comment">
          <span>Admin comment</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={4000}
            rows={4}
            placeholder="Required for request changes, rejection or blocking"
          />
        </label>
      ) : null}

      {actions.length ? (
        <div className="admin-moderation-buttons">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={pendingAction !== null || !adminToken}
              onClick={() => void runAction(action)}
            >
              {pendingAction === action.id
                ? "Saving..."
                : action.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="admin-moderation-empty">
          No admin action is available for this status.
        </p>
      )}

      {!adminToken ? (
        <p className="admin-moderation-error">
          Load the dashboard with an admin token first.
        </p>
      ) : null}

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
