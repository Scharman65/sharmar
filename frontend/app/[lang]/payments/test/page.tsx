export default function PaymentsEnvTestPage() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  const prefix = key.slice(0, 7); // "pk_test" / "pk_live"
  const ok = key.startsWith("pk_");

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Payments env sanity</h1>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, maxWidth: 520 }}>
        <div><b>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</b>: {ok ? "present" : "missing/invalid"}</div>
        <div><b>prefix</b>: {key ? prefix : "-"}</div>
        <div><b>length</b>: {key ? key.length : 0}</div>
        <div style={{ marginTop: 8, color: ok ? "green" : "crimson" }}>
          {ok ? "OK" : "NOT OK (must start with pk_)"}
        </div>
      </div>

      <p style={{ marginTop: 12, color: "#666" }}>
        This page does not print the full key.
      </p>
    </main>
  );
}
