// Placeholder VIP roster — swap in real names/photos once available.
// Plain hex (not `var(--color-...)`) on purpose: VipBox and VipSpotlight
// both build translucent tints like `${color}33` by string
// concatenation, which only works with a real hex string, not a CSS
// custom-property reference. These mirror the theme's own tokens (see
// resources/css/app.css `@theme`): orange-500, sky-500, red-600, gold-500.
export const VIPS = [
  {
    id: 1,
    name: "VIP Guest 1",
    color: "#f5a051",
    image: "/images/VIPs/estes_png_by_teh90blog_denckzu-pre.png",
  },
  {
    id: 2,
    name: "VIP Guest 2",
    color: "#3d97d6",
    image: "/images/VIPs/ling___night_shade_mlbb_png_by_dechunf_dea5077-pre.png",
  },
  {
    id: 3,
    name: "VIP Guest 3",
    color: "#a53623",
    image: "/images/VIPs/skin_hayabusa_epic_mlbb_png_by_dechunf_ddrax87-fullview.png",
  },
  {
    id: 4,
    name: "VIP Guest 4",
    color: "#e3a94f",
    image: "/images/VIPs/vexana_revamp_mlbb_png_tranparant_by_dechunf_df6znvn-pre.png",
  },
];
