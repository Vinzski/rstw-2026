// LogoMark's mix-blend-multiply trick only knocks out the seal's white
// background correctly against a light surface — this page runs a dark
// navy theme, so every place the seal appears here sits on its own small
// paper-colored chip first, giving multiply something light to blend
// against regardless of what's behind it.
export default function LogoBadge({ size = 40, imgSize, glow = false, className = "" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-paper-50 ${className}`}
      style={{
        width: size,
        height: size,
        padding: size * 0.12,
        boxShadow: glow ? "0 0 30px 6px rgba(245,160,81,0.45)" : "0 1px 3px rgba(0,0,0,0.35)",
      }}
    >
      <img
        src="/images/dost-logo.png"
        alt="DOST Zamboanga Peninsula"
        className="h-full w-full object-contain mix-blend-multiply"
        style={imgSize ? { width: imgSize, height: imgSize } : undefined}
      />
    </span>
  );
}
