import type { SVGProps } from "react";

export interface GifIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
}

/**
 * Biểu tượng GIF vector đồng bộ kích thước và phong cách với bộ Lucide Icons.
 */
export function GifIcon({
  size = 20,
  strokeWidth = 2,
  ...props
}: GifIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M9.5 8.5H7.5A1.5 1.5 0 0 0 6 10v4a1.5 1.5 0 0 0 1.5 1.5h2V12H8" />
      <path d="M12 8.5v7" />
      <path d="M14.5 15.5v-7h3.5" />
      <path d="M14.5 12H17" />
    </svg>
  );
}

export default GifIcon;

