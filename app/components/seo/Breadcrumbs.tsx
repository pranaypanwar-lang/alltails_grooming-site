import Link from "next/link";

type Crumb = { name: string; path: string };

type BreadcrumbsProps = {
  items: Crumb[];
  className?: string;
};

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center gap-1 text-[12.5px] text-[#8a82a3] ${className}`}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.path} className="flex items-center gap-1">
            {i > 0 && <span className="text-[#cfc7df]" aria-hidden>/</span>}
            {isLast ? (
              <span className="text-[#241b4b] font-medium" aria-current="page">
                {item.name}
              </span>
            ) : (
              <Link href={item.path} className="hover:text-[#5b49c8] transition-colors">
                {item.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
