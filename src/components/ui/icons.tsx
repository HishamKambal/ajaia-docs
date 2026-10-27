import type { ReactNode, SVGProps } from "react";

// Inline stroke icons (24px grid), so the app ships no icon dependency.
export type IconProps = SVGProps<SVGSVGElement>;

function SvgIcon({ children, className = "size-4", ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M5 12h14M12 5v14" /></SvgIcon>;
}

export function UploadIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></SvgIcon>;
}

export function DownloadIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></SvgIcon>;
}

export function FileTextIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </SvgIcon>
  );
}

export function TrashIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></SvgIcon>;
}

/** Points toward the inline start; mirrored in RTL. */
export function BackIcon({ className = "size-4", ...props }: IconProps) {
  return <SvgIcon className={`${className} rtl:-scale-x-100`} {...props}><path d="M19 12H5M12 19l-7-7 7-7" /></SvgIcon>;
}

export function BoldIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" /></SvgIcon>;
}

export function ItalicIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M19 4h-9M14 20H5M15 4 9 20" /></SvgIcon>;
}

export function UnderlineIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M6 4v6a6 6 0 0 0 12 0V4M4 20h16" /></SvgIcon>;
}

export function BulletListIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></SvgIcon>;
}

export function OrderedListIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></SvgIcon>;
}

export function UndoIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></SvgIcon>;
}

export function RedoIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M21 7v6h-6M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" /></SvgIcon>;
}

export function ChevronDownIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="m6 9 6 6 6-6" /></SvgIcon>;
}

export function CloseIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M18 6 6 18M6 6l12 12" /></SvgIcon>;
}

export function CheckIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M20 6 9 17l-5-5" /></SvgIcon>;
}

export function AlertIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </SvgIcon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </SvgIcon>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </SvgIcon>
  );
}

export function RefreshIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" /></SvgIcon>;
}

export function SwitchUserIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></SvgIcon>;
}

export function CloudOffIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m2 2 20 20" />
      <path d="M5.8 5.8A7 7 0 0 0 7 19h10a5 5 0 0 0 2.9-.9M21.7 15.2A4.5 4.5 0 0 0 17.5 9h-1.3A7 7 0 0 0 9.3 4.6" />
    </SvgIcon>
  );
}
