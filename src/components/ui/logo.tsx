export function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-lg bg-brand text-white">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <path d="M7 3h7l5 5v13H7z" strokeLinejoin="round" />
          <path d="M10 13h6M10 17h4" strokeLinecap="round" />
        </svg>
      </span>
      {withText && <span className="text-[15px] font-semibold tracking-tight text-zinc-900">Ajaia Docs</span>}
    </span>
  );
}
