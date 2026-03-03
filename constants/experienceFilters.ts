export const QUICK_TABS = [
  "Discover",
  "Today",
  "Free",
  "Nearby",
  "Hosted",
  "Saved",
] as const;

export const CATEGORY_MAP: Record<string, string[]> = {
  Cafes: ["cafe", "bakery"],
  Restaurants: ["restaurant", "food"],
  Bars: ["bar", "night_club"],
  Outdoor: ["park", "campground", "zoo", "aquarium"],
  Hikes: ["natural_feature", "park"],
  Cultural: ["museum", "art_gallery", "church"],
};

export const FILTER_GROUPS = [
  {
    title: "Food & Drink",
    items: [
      "Cafes",
      "Restaurants",
      "Street Food",
      "Bars",
      "Brunch Spots",
      "Hidden Gems",
    ],
  },
  {
    title: "Activities",
    items: [
      "Outdoor",
      "Hikes",
      "Sports",
      "Creative Workshops",
      "Volunteering",
      "Live Music",
      "Classes & Learning",
      "Events",
      "Pop-ups",
      "Markets",
    ],
  },
  {
    title: "Vibe",
    items: [
      "Chill",
      "Social",
      "Adventurous",
      "Cozy",
      "Productive",
      "Cultural",
      "Romantic",
      "Budget-friendly",
      "Luxury",
    ],
  },
] as const;

export const SMART_FILTER_GROUPS = [
  {
    title: "Distance",
    items: ["1 km", "5 km", "10 km", "Anywhere"],
  },
  {
    title: "Price",
    items: ["Free", "$", "$$", "$$$"],
  },
  {
    title: "Group Size",
    items: ["Solo friendly", "2-4 people", "5-10 people", "Big groups"],
  },
  {
    title: "Age Range (for hosted experiences)",
    items: ["All ages", "18+", "21+", "30+", "40+", "50+"],
  },
  {
    title: "Difficulty (for hikes/sports)",
    items: ["Easy", "Moderate", "Advanced"],
  },
  {
    title: "Duration",
    items: ["Under 1 hour", "1-3 hours", "Half day", "Full day"],
  },
  {
    title: "Setting",
    items: ["Indoor", "Outdoor", "Both"],
  },
] as const;
