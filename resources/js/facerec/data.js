// Exactly two slots, side by side, full-screen — see FaceRecognitionPage.
// Actual face recognition happens on a separate device/app entirely; this
// site only ever *receives* a "VipEvent" broadcast (see echo.js) once
// someone's already been verified there, and matches it to one of these
// two slots by `designation`. So unlike the old local-camera flow, a slot
// starts with no `name`/`image`/`affiliation` at all — those three (plus
// `datetime`, unused for display but part of the same payload) only exist
// once that slot's own broadcast arrives; until then the panel just reads
// as locked. `color`/`logo` are each slot's own fixed institutional
// branding and never change. Plain hex (not `var(--color-...)`) on
// purpose: VipBox builds translucent tints like `${color}33` by string
// concatenation, which only works with a real hex string, not a CSS
// custom-property reference.
// Array order is on-screen left-to-right order (see useStageMetrics'
// `slots`) — Governor on the left, Secretary on the right.
export const VIPS = [
  {
    id: "governor",
    designation: "Governor",
    color: "#86281a", // maroon (red-700)
    logo: "/images/VIP LOGOs/Ph_seal_zamboanga_del_norte.png",
  },
  {
    id: "secretary",
    designation: "Secretary",
    color: "#f5a051", // orange (orange-500)
    logo: "/images/VIP LOGOs/dost-logo.png",
  },
];

// Manual fallback for a live event: if the real scanner has a technical
// issue and never broadcasts, an operator can press Space on this page
// (see FaceRecognitionPage) to fill both slots from here instead of the
// screen sitting stuck on "Awaiting check-in." Same shape as a real
// VipEvent payload's own `vip` field, so it runs through the exact same
// matching/reveal logic as a real broadcast would.
export const BACKUP_VIPS = [
  {
    name: "Dr. Renato U. Solidum, Jr.",
    designation: "Secretary",
    affiliation: "Department of Science and Technology",
    avatar: "https://kradwashere.s3.ap-southeast-1.amazonaws.com/oneportal/vips/Cl4o0SEGp9.png?v=1785802050",
    datetime: "August 4, 2026 2:33 PM",
  },
  {
    name: "Hon. Darel Dexter T. Uy",
    designation: "Governor",
    affiliation: "Province of Zamboanga Del Norte",
    avatar: "https://kradwashere.s3.ap-southeast-1.amazonaws.com/oneportal/vips/U0EWh0238I.png?v=1785802099",
    datetime: "August 4, 2026 2:34 PM",
  },
];
