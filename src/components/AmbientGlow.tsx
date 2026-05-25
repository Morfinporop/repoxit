interface AmbientGlowProps {
  color?: string;
  intensity?: number;
}

export function AmbientGlow({ color = "#7c5cfc", intensity = 0.45 }: AmbientGlowProps) {
  const alpha = Math.min(1, intensity);
  return (
    <>
      {/* Left ambient glow */}
      <div
        className="ambient-left"
        style={{ background: `radial-gradient(ellipse, ${color}, transparent 70%)`, opacity: alpha }}
      />
      {/* Right ambient glow */}
      <div
        className="ambient-right"
        style={{ background: `radial-gradient(ellipse, #c05cfc, transparent 70%)`, opacity: alpha }}
      />
      {/* Top center subtle glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top, ${color}18, transparent 70%)`,
        }}
      />
      {/* Bottom center accent */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}60, #c05cfc60, transparent)`,
        }}
      />
    </>
  );
}
