"use client";

import { useState } from "react";

type Props = {
  lang: string;
  token: string;
  requestStatus: string | null;
  paymentStatus: string | null;
  bookingStatus: string | null;
};

type ActionName = "confirm" | "decline" | "refund";

function getText(lang: string) {
  if (lang === "ru") {
    return {
      confirm: "Подтвердить",
      decline: "Отклонить",
      refund: "Сделать возврат",
      working: "Выполняется...",
      refresh: "Обновить страницу",
      success: "Действие выполнено успешно.",
      failed: "Не удалось выполнить действие.",
      cannotAct: "Для текущего состояния действие недоступно.",
    };
  }

  if (lang === "me") {
    return {
      confirm: "Potvrdi",
      decline: "Odbij",
      refund: "Pokreni refundaciju",
      working: "U toku...",
      refresh: "Osveži stranicu",
      success: "Akcija je uspješno izvršena.",
      failed: "Akciju nije moguće izvršiti.",
      cannotAct: "Akcija nije dostupna za trenutno stanje.",
    };
  }

  return {
    confirm: "Confirm",
    decline: "Decline",
    refund: "Issue refund",
    working: "Processing...",
    refresh: "Refresh page",
    success: "Action completed successfully.",
    failed: "Could not complete the action.",
    cannotAct: "Action is not available for the current state.",
  };
}

export default function OwnerActions({ lang, token, requestStatus, paymentStatus, bookingStatus }: Props) {
  const tr = getText(lang);
  const [busy, setBusy] = useState<ActionName | null>(null);
  const [message, setMessage] = useState<string>("");

  const isFinal =
    requestStatus === "declined" ||
    requestStatus === "confirmed" ||
    bookingStatus === "expired";

  const canConfirm =
    !isFinal && (requestStatus === "paid_pending_owner" || requestStatus === "pending");

  const canDecline =
    !isFinal && (requestStatus === "paid_pending_owner" || requestStatus === "pending");

  const canRefund =
    !isFinal && (requestStatus === "confirmed" || bookingStatus === "deposit_paid");

  async function run(action: ActionName) {
    setMessage("");

    if (
      (action === "confirm" && !canConfirm) ||
      (action === "decline" && !canDecline) ||
      (action === "refund" && !canRefund)
    ) {
      setMessage(tr.cannotAct);
      return;
    }

    setBusy(action);

    try {
      const res = await fetch(`/api/owner-actions/${encodeURIComponent(token)}/${action}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json || json.ok !== true) {
        const upstreamError =
          json && typeof json === "object" && "error" in json && typeof json.error === "string"
            ? json.error
            : tr.failed;
        setMessage(`${tr.failed} ${upstreamError}`.trim());
        setBusy(null);
        return;
      }

      setMessage(tr.success);
      window.location.reload();
    } catch (err) {
      setMessage(`${tr.failed} ${String(err)}`);
      setBusy(null);
    }
  }

  const buttonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "inherit",
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
  };

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="button" style={buttonStyle} onClick={() => run("confirm")} disabled={busy !== null || !canConfirm}>
          {busy === "confirm" ? tr.working : tr.confirm}
        </button>

        <button type="button" style={buttonStyle} onClick={() => run("decline")} disabled={busy !== null || !canDecline}>
          {busy === "decline" ? tr.working : tr.decline}
        </button>

        <button type="button" style={buttonStyle} onClick={() => run("refund")} disabled={busy !== null || !canRefund}>
          {busy === "refund" ? tr.working : tr.refund}
        </button>

        <button type="button" style={buttonStyle} onClick={() => window.location.reload()} disabled={busy !== null}>
          {tr.refresh}
        </button>
      </div>

      {message ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.04)",
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
