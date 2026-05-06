import { permanentRedirect } from "next/navigation";

export default async function BlogArticleCompatibilityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/blogs/${slug}`);
}
