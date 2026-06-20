export function TrustBlock() {
  return (
    <div
      style={{
        marginTop: 24,
        padding: 18,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        display: "grid",
        gap: 10,
        background: "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.92)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 18 }}>Why book with Sharmar</div>
      <div style={{ opacity: 0.9 }}>✅ Verified boat owners</div>
      <div style={{ opacity: 0.9 }}>🔒 Secure payment via Stripe</div>
      <div style={{ opacity: 0.9 }}>💸 Flexible cancellation options</div>
    </div>
  );
}
