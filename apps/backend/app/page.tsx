import { redirect } from "next/navigation";

export default function Home() {
  // Backend app doesn't serve web pages, redirect to health endpoint
  redirect("/api/health");
}
