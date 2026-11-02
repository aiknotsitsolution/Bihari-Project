import { useWindowDimensions } from "react-native";

export const GRID_GAP = 12;
export const SCREEN_PAD = 16;

/** 2-column product grid ka card width */
export function useCardWidth(): number {
  const { width } = useWindowDimensions();
  return Math.floor((width - SCREEN_PAD * 2 - GRID_GAP) / 2);
}
