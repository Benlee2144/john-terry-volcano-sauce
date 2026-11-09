// The lineup, lowest explosivity first. Copy comes from the makers' own notes.
// `made` is only what the makers' notes confirm. Set `ingredients` to the array from the real label and the
// bottle's back panel switches from "Made with" to a full "Ingredients" list.
// Colors are raw sRGB; `c1..c3` tint the lava from dark glow to hottest core.
export const SAUCES = [
  { id: 'verde', name: "Ryn's Mellow Verde", made: ["Jalapeño", "Tomatillo", "Poblano"], ingredients: null, vei: 1, sauce: 0x6f7a16, c1: 0x0d3a10, c2: 0x4aa81e, c3: 0xd6f25a, heat: 0.24, dim: 0.62, flood: 0, shake: 0 },
  { id: 'zaxe', name: "Zaxe Sauce", made: ["Jalapeño"], ingredients: null, vei: 2, sauce: 0x8d7e1e, c1: 0x3f3307, c2: 0xc29e12, c3: 0xffe76a, heat: 0.32, dim: 0.62, flood: 0, shake: 0 },
  { id: 'ragin', name: "Ragin' Cajun", made: ["Serrano", "Habanero", "Our own Cajun seasoning"], ingredients: null, vei: 4, sauce: 0xb03a12, c1: 0x5a1206, c2: 0xe8500f, c3: 0xffb43c, heat: 0.52, dim: 0.66, flood: 0, shake: 0.1 },
  { id: 'shine', name: "Shine the Light", made: ["Serrano", "Jalapeño", "Habanero", "Ginger"], ingredients: null, vei: 6, sauce: 0xa87d1a, c1: 0x640b08, c2: 0xf0380f, c3: 0xffc13d, heat: 0.72, dim: 0.7, flood: 0.08, shake: 0.25 },
  { id: 'ichiban', name: "Ichiban", made: ["Habanero"], ingredients: null, vei: 7, sauce: 0xbd8233, c1: 0x6a0606, c2: 0xff2a0a, c3: 0xffd860, heat: 0.86, dim: 0.72, flood: 0.14, shake: 0.5 },
  { id: 'amy', name: "Amy's Sweet Heat", made: ["Scorpion pepper", "Mango"], ingredients: null, vei: 8, sauce: 0xc9921f, c1: 0x6b0432, c2: 0xff1f6b, c3: 0xffc24a, heat: 1, dim: 0.76, flood: 0.26, shake: 1 },
];

export const DEFAULT_PALETTE = { c1: 0x6a0e04, c2: 0xff4a0c, c3: 0xffc23a };

// The bottle that rises in the hero, before the Index starts.
export const HERO_SAUCE = 2;
