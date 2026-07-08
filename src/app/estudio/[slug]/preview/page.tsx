import { redirect } from "next/navigation";

export default function PublicPreviewRedirect() {
  redirect("/dashboard/preview");
}
