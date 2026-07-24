import { redirect } from "next/navigation";

/** AgriBot moved to a floating widget on farmer pages. */
export default function FarmerChatRedirect() {
  redirect("/farmer/scan");
}
