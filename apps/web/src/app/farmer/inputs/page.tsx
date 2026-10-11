import { redirect } from "next/navigation";

/** The inputs finder became the farmer marketplace. */
export default function FarmerInputsRedirect() {
  redirect("/farmer/marketplace");
}
