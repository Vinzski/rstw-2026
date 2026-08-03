// Exactly two now: both scan side by side, full-screen, at the same
// time — see FaceRecognitionPage. Plain hex (not `var(--color-...)`) on
// purpose: VipBox builds translucent tints like `${color}33` by string
// concatenation, which only works with a real hex string, not a CSS
// custom-property reference.
// `logo` is this VIP's own institutional mark — shown beside their photo
// once they verify, then carried into the merge (see LogoFusion).
export const VIPS = [
  {
    id: 2,
    name: "Dr. RENATO U. SOLIDUM, JR.",
    title: "DOST Secretary",
    color: "#f5a051", // orange (orange-500)
    image: "/images/VIPs/2026_Sec_SRUS.png",
    logo: "/images/VIP LOGOs/dost-logo.png",
  },
  {
    id: 1,
    name: "DAREL DEXTER UY",
    title: "Governor of Zamboanga Del Norte",
    color: "#86281a", // maroon (red-700)
    image: "/images/VIPs/Governor_Darel_Dexter_Uy.png",
    logo: "/images/VIP LOGOs/Ph_seal_zamboanga_del_norte.png",
  },
];
