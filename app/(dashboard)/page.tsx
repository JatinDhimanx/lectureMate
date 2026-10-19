// Top-level redirects from /dashboard, /study, /lectures, /upload etc.
import { redirect } from "next/navigation";
export default function DashboardRedirect() {
  redirect("/dashboard");
}
