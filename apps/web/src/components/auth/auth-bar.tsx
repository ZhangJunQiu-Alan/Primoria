export function AuthBar({ email }: { email: string }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        right: 12,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        color: "#555",
      }}
    >
      <span>{email}</span>
      <a href="/account" style={{ color: "#555", textDecoration: "none" }}>
        账户
      </a>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: "#fff",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          退出
        </button>
      </form>
    </div>
  );
}
