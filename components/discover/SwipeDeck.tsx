// ─────────────────────────────────────────────────────────────
// components/discover/SwipeDeck.tsx
// Renders the visible portion of the card stack (top 3 cards).
// Connects useSwipeDeck hook state to SwipeCard components.
// ─────────────────────────────────────────────────────────────
import { SWIPE } from "@/lib/constants";
import type { Experience } from "@/types";
import { View } from "react-native";
import { SwipeCard } from "./SwipeCard";

interface SwipeDeckProps {
  deck: Experience[];
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
}

export const SwipeDeck = React.memo(
  ({ deck, onSwipeLeft, onSwipeRight, onSwipeUp }: SwipeDeckProps) => {
    // Only render the top DECK_SIZE cards for performance
    const visible = deck.slice(0, SWIPE.DECK_SIZE);

    return (
      <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
        {visible.map((exp, i) => (
          <SwipeCard
            key={exp.id}
            experience={exp}
            index={i}
            onSwipeLeft={i === 0 ? onSwipeLeft : () => {}}
            onSwipeRight={i === 0 ? onSwipeRight : () => {}}
            onSwipeUp={i === 0 ? onSwipeUp : () => {}}
          />
        ))}
      </View>
    );
  },
);
