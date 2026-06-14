import type { CSSProperties } from "react";

export const authStyles = {
  container: {
    maxWidth: 360,
    margin: "10vh auto",
    padding: "0 16px",
    fontFamily: "system-ui, sans-serif",
  } as CSSProperties,
  title: { fontSize: 22, fontWeight: 600, marginBottom: 20 } as CSSProperties,
  label: { fontSize: 13, color: "#555", marginBottom: 4 } as CSSProperties,
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 14,
  } as CSSProperties,
  primaryButton: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "none",
    background: "#111",
    color: "#fff",
    fontSize: 14,
    cursor: "pointer",
  } as CSSProperties,
  secondaryButton: {
    width: "100%",
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    fontSize: 14,
    cursor: "pointer",
  } as CSSProperties,
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "16px 0",
    borderTop: "1px solid #eee",
  } as CSSProperties,
  sectionTitle: { fontSize: 15, fontWeight: 600 } as CSSProperties,
  error: { color: "#c0392b", fontSize: 13, marginTop: 12 } as CSSProperties,
  success: { color: "#27713a", fontSize: 13, marginTop: 12 } as CSSProperties,
  footer: { fontSize: 13, marginTop: 20, color: "#555" } as CSSProperties,
};
