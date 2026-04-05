import type { SVGProps } from "react";

/** Checkered racing flag on a pole — reads as “finish line” in the nav. */
export function FinishLineIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <line
        x1="4"
        x2="4"
        y1="22"
        y2="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* 3×2 checker on flag */}
      <rect x="6" y="6" width="4" height="4" fill="currentColor" opacity={1} />
      <rect x="10" y="6" width="4" height="4" fill="currentColor" opacity={0.35} />
      <rect x="14" y="6" width="4" height="4" fill="currentColor" opacity={1} />
      <rect x="6" y="10" width="4" height="4" fill="currentColor" opacity={0.35} />
      <rect x="10" y="10" width="4" height="4" fill="currentColor" opacity={1} />
      <rect x="14" y="10" width="4" height="4" fill="currentColor" opacity={0.35} />
      <path
        d="M6 6h12v8H6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
