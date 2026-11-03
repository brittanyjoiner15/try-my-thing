import { requireProfile } from "@/lib/session";
import { getDeck } from "@/lib/data";
import SwipeDeck from "./SwipeDeck";

export default async function SwipePage() {
  const { user } = await requireProfile();
  return <SwipeDeck initialCards={await getDeck(user.id)} />;
}
