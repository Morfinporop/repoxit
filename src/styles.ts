import { CSSProperties } from "react";

/* ─── Shared style primitives ─── */

export const glass: CSSProperties = {
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.65)",
  boxShadow: "0 2px 20px rgba(0,0,0,0.04)",
};

export const glassDark: CSSProperties = {
  background: "rgba(0,0,0,0.25)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.12)",
};

export const gradientAccent: CSSProperties = {
  background: "linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #67e8f9 100%)",
};

export const gradientBg: CSSProperties = {
  background: "linear-gradient(180deg, #f8f8fa 0%, #eee 100%)",
};

export const gradientWhite: CSSProperties = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(245,245,247,0.9) 100%)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
};

export const pill: CSSProperties = {
  borderRadius: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const glassBtn: CSSProperties = {
  ...glass,
  ...pill,
  cursor: "pointer",
  transition: "transform 0.15s, box-shadow 0.15s",
};

export const actionBtn: CSSProperties = {
  ...glassDark,
  ...pill,
  width: 48,
  height: 48,
  color: "#fff",
  cursor: "pointer",
  transition: "transform 0.15s",
};

export const navBtn: CSSProperties = {
  ...glass,
  ...pill,
  width: 44,
  height: 44,
  cursor: "pointer",
  color: "#444",
  transition: "transform 0.15s, background 0.2s",
};

export const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: "rgba(0,0,0,0.35)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const modal: CSSProperties = {
  ...gradientWhite,
  borderRadius: 24,
  width: "100%",
  maxWidth: 440,
  maxHeight: "90dvh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 8px 60px rgba(0,0,0,0.12)",
  margin: 16,
};

export const sheet: CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  ...gradientWhite,
  borderRadius: "24px 24px 0 0",
  maxHeight: "80dvh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  border: "1px solid rgba(255,255,255,0.6)",
  borderBottom: "none",
  boxShadow: "0 -4px 40px rgba(0,0,0,0.08)",
};

export const input: CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 14,
  background: "rgba(0,0,0,0.03)",
  border: "1px solid rgba(0,0,0,0.06)",
  fontSize: 14,
  color: "#1d1d1f",
  transition: "border-color 0.2s",
};

export const progressTrack: CSSProperties = {
  height: 3,
  background: "rgba(255,255,255,0.25)",
  borderRadius: 2,
  overflow: "hidden",
  cursor: "pointer",
};

export const progressFill: CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, #a78bfa, #f472b6)",
  borderRadius: 2,
  transition: "width 0.1s linear",
};

export const volTrack: CSSProperties = {
  width: 4,
  height: 80,
  background: "rgba(255,255,255,0.2)",
  borderRadius: 2,
  position: "relative",
  cursor: "pointer",
};

export const volFill: CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  background: "linear-gradient(0deg, #a78bfa, #f472b6)",
  borderRadius: 2,
};
