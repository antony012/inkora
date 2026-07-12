import { redirect } from "next/navigation";

export default function VerificacionesRedirectPage() {
  redirect("/dashboard/usuarios?tab=verificaciones");
}
