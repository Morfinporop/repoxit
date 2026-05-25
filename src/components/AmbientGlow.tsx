interface AmbientGlowProps {
  color?: string;
  intensity?: number;
}

export function AmbientGlow({ color = "#7c5cfc", intensity = 0.35 }: AmbientGlowProps) {
  const alpha = Math.min(1, intensity);
  return (
    <>
      {/* Left glow */}
      <div
        className="ambient-left"
        style={{ 
          background: `radial-gradient(ellipse, ${color}, transparent 65%)`, 
          opacity: alpha * 0.7
        }}
      />
      {/* Right glow */}
      <div
        className="ambient-right"
        style={{ 
          background: `radial-gradient(ellipse, #c05cfc, transparent 65%)`, 
          opacity: alpha * 0.7
        }}
      />
    </>
  );
}
