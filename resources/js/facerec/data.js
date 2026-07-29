// Placeholder VIP roster — swap in real names once available.
// Plain hex (not `var(--color-...)`) on purpose: VipBox builds
// translucent tints like `${color}33` by string concatenation, which
// only works with a real hex string, not a CSS custom-property
// reference. Both each panel's border (VipBox) and its connector line
// to the next panel (RowConnectors) are driven off this same color, so
// changing it here updates both at once.
export const VIPS = [
  {
    id: 1,
    name: "VIP Guest 1",
    color: "#86281a", // maroon (red-700)
    image: "/images/VIPs/image1.png",
  },
  {
    id: 2,
    name: "VIP Guest 2",
    color: "#f5a051", // orange (orange-500)
    image: "/images/VIPs/image2.png",
  },
  {
    id: 3,
    name: "VIP Guest 3",
    color: "#6fbdea", // light blue (sky-400)
    image: "/images/VIPs/image3.png",
  },
  {
    id: 4,
    name: "VIP Guest 4",
    color: "#1d477e", // dark blue (navy-700)
    image: "/images/VIPs/image4.png",
  },
];
