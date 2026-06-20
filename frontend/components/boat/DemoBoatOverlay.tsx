export function DemoBoatOverlay() {
  return (
    <div
      aria-label="Test boat"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        background:
          "linear-gradient(135deg, rgba(0,0,0,0.08), rgba(0,0,0,0.18))",
      }}
    >
      <div
        style={{
          transform: "rotate(-18deg)",
          padding: "10px 28px",
          border: "2px solid rgba(255,255,255,0.78)",
          borderRadius: 14,
          background: "rgba(0,0,0,0.36)",
          color: "rgba(255,255,255,0.88)",
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          backdropFilter: "blur(2px)",
        }}
      >
        TEST
      </div>
    </div>
  );
}
