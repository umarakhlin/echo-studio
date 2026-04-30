import Link from "next/link";
import type { ReactNode } from "react";

import { buttonClassName, type ButtonSize, type ButtonVariant } from "./buttonClasses";

interface ButtonLinkProps extends Omit<
  React.ComponentProps<typeof Link>,
  "className" | "children"
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * קישור שנראה כמו Button — נותן `<a class="btn…">` במקום `<a><button>` (תקין ל-HTML ול-React).
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  startIcon,
  endIcon,
  className,
  children,
  ...linkProps
}: ButtonLinkProps) {
  return (
    <Link
      {...linkProps}
      className={buttonClassName(variant, size, { fullWidth, className })}
    >
      {startIcon && <span className="shrink-0">{startIcon}</span>}
      <span>{children}</span>
      {endIcon && <span className="shrink-0">{endIcon}</span>}
    </Link>
  );
}
