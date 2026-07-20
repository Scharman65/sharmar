export type BoatModerationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_changes"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

export type BoatModerationAction =
  | "start_review"
  | "request_changes"
  | "reject"
  | "approve"
  | "publish"
  | "unpublish"
  | "archive";

export type OwnerVerificationStatus =
  | "new"
  | "email_verified"
  | "whatsapp_verified"
  | "documents_uploaded"
  | "under_review"
  | "approved"
  | "rejected"
  | "blocked";

export type OwnerModerationAction =
  | "start_review"
  | "request_changes"
  | "reject"
  | "approve"
  | "block";

export type ExperienceModerationStatus =
  | "submitted"
  | "under_review"
  | "needs_changes"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

export type ExperienceModerationAction =
  | "start_review"
  | "request_changes"
  | "reject"
  | "approve"
  | "publish"
  | "unpublish"
  | "archive";

type TransitionResult<TStatus extends string> =
  | {
      ok: true;
      nextStatus: TStatus;
      commentRequired: boolean;
    }
  | {
      ok: false;
      code:
        | "invalid_action"
        | "invalid_current_status"
        | "transition_not_allowed"
        | "comment_required";
    };

const BOAT_TRANSITIONS: Record<
  BoatModerationAction,
  Partial<Record<BoatModerationStatus, BoatModerationStatus>>
> = {
  start_review: {
    submitted: "under_review",
  },
  request_changes: {
    under_review: "needs_changes",
  },
  reject: {
    submitted: "rejected",
    under_review: "rejected",
    needs_changes: "rejected",
  },
  approve: {
    under_review: "approved",
  },
  publish: {
    approved: "published",
  },
  unpublish: {
    published: "approved",
  },
  archive: {
    approved: "archived",
    published: "archived",
    rejected: "archived",
  },
};

const OWNER_TRANSITIONS: Record<
  OwnerModerationAction,
  Partial<Record<OwnerVerificationStatus, OwnerVerificationStatus>>
> = {
  start_review: {
    documents_uploaded: "under_review",
    rejected: "under_review",
  },
  request_changes: {
    under_review: "documents_uploaded",
  },
  reject: {
    documents_uploaded: "rejected",
    under_review: "rejected",
  },
  approve: {
    under_review: "approved",
  },
  block: {
    new: "blocked",
    email_verified: "blocked",
    whatsapp_verified: "blocked",
    documents_uploaded: "blocked",
    under_review: "blocked",
    approved: "blocked",
    rejected: "blocked",
  },
};

const EXPERIENCE_TRANSITIONS: Record<
  ExperienceModerationAction,
  Partial<Record<ExperienceModerationStatus, ExperienceModerationStatus>>
> = {
  start_review: {
    submitted: "under_review",
    rejected: "under_review",
    needs_changes: "under_review",
  },
  request_changes: {
    under_review: "needs_changes",
  },
  reject: {
    submitted: "rejected",
    under_review: "rejected",
    needs_changes: "rejected",
  },
  approve: {
    under_review: "approved",
  },
  publish: {
    approved: "published",
  },
  unpublish: {
    published: "approved",
  },
  archive: {
    approved: "archived",
    published: "archived",
    rejected: "archived",
  },
};

const COMMENT_REQUIRED_ACTIONS = new Set([
  "request_changes",
  "reject",
  "block",
]);

function cleanComment(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function planBoatModerationTransition(params: {
  currentStatus: string;
  action: string;
  comment?: unknown;
}): TransitionResult<BoatModerationStatus> {
  const action = params.action as BoatModerationAction;
  const transitions = BOAT_TRANSITIONS[action];

  if (!transitions) {
    return { ok: false, code: "invalid_action" };
  }

  if (!(params.currentStatus in {
    draft: true,
    submitted: true,
    under_review: true,
    needs_changes: true,
    approved: true,
    published: true,
    rejected: true,
    archived: true,
  })) {
    return { ok: false, code: "invalid_current_status" };
  }

  const currentStatus = params.currentStatus as BoatModerationStatus;
  const nextStatus = transitions[currentStatus];

  if (!nextStatus) {
    return { ok: false, code: "transition_not_allowed" };
  }

  const commentRequired = COMMENT_REQUIRED_ACTIONS.has(action);
  if (commentRequired && !cleanComment(params.comment)) {
    return { ok: false, code: "comment_required" };
  }

  return {
    ok: true,
    nextStatus,
    commentRequired,
  };
}

export function planOwnerModerationTransition(params: {
  currentStatus: string;
  action: string;
  comment?: unknown;
}): TransitionResult<OwnerVerificationStatus> {
  const action = params.action as OwnerModerationAction;
  const transitions = OWNER_TRANSITIONS[action];

  if (!transitions) {
    return { ok: false, code: "invalid_action" };
  }

  if (!(params.currentStatus in {
    new: true,
    email_verified: true,
    whatsapp_verified: true,
    documents_uploaded: true,
    under_review: true,
    approved: true,
    rejected: true,
    blocked: true,
  })) {
    return { ok: false, code: "invalid_current_status" };
  }

  const currentStatus = params.currentStatus as OwnerVerificationStatus;
  const nextStatus = transitions[currentStatus];

  if (!nextStatus) {
    return { ok: false, code: "transition_not_allowed" };
  }

  const commentRequired = COMMENT_REQUIRED_ACTIONS.has(action);
  if (commentRequired && !cleanComment(params.comment)) {
    return { ok: false, code: "comment_required" };
  }

  return {
    ok: true,
    nextStatus,
    commentRequired,
  };
}

export function planExperienceModerationTransition(params: {
  currentStatus: string;
  action: string;
  comment?: unknown;
}): TransitionResult<ExperienceModerationStatus> {
  const action = params.action as ExperienceModerationAction;
  const transitions = EXPERIENCE_TRANSITIONS[action];

  if (!transitions) {
    return { ok: false, code: "invalid_action" };
  }

  if (!(params.currentStatus in {
    submitted: true,
    under_review: true,
    needs_changes: true,
    approved: true,
    published: true,
    rejected: true,
    archived: true,
  })) {
    return { ok: false, code: "invalid_current_status" };
  }

  const currentStatus = params.currentStatus as ExperienceModerationStatus;
  const nextStatus = transitions[currentStatus];

  if (!nextStatus) {
    return { ok: false, code: "transition_not_allowed" };
  }

  const commentRequired = COMMENT_REQUIRED_ACTIONS.has(action);
  if (commentRequired && !cleanComment(params.comment)) {
    return { ok: false, code: "comment_required" };
  }

  return {
    ok: true,
    nextStatus,
    commentRequired,
  };
}
