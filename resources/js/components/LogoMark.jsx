// The DOST seal on its own — no ring, no crop. The source file is a
// square JPG on a white background, so instead of masking it (which
// clipped the seal's outer points), the white is knocked out with a
// multiply blend — invisible against the site's light paper surfaces.
export default function LogoMark({ size = 36 }) {
  return (
    <img
      src="/images/dost-logo.png"
      alt="DOST Zamboanga Peninsula"
      className="shrink-0 object-contain mix-blend-multiply"
      style={{ width: size, height: size }}
    />
  );
}
