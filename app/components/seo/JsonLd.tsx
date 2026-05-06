import { jsonLdString } from "@/lib/seo/schema";

type JsonLdProps = {
  data: object | object[];
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdString(data) }}
    />
  );
}
