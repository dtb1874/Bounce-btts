import type { HTMLAttributes, ReactNode } from "react";

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: "section" | "article" | "div";
  children: ReactNode;
};

export function Surface({ as = "section", className = "", children, ...props }: SurfaceProps) {
  const Component = as;
  const classes = ["uiSurface", className].filter(Boolean).join(" ");
  return <Component className={classes} {...props}>{children}</Component>;
}

type SectionHeadingProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function SectionHeading({ className = "", children, ...props }: SectionHeadingProps) {
  const classes = ["uiSectionHeading", className].filter(Boolean).join(" ");
  return <div className={classes} {...props}>{children}</div>;
}
