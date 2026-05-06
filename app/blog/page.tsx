import { permanentRedirect } from "next/navigation";

export default function BlogCompatibilityPage() {
  permanentRedirect("/blogs");
}
