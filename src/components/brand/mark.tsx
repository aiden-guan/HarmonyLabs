export function Mark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="currentColor" />
      <path d="M16 6v20M6 16h20" stroke="#f0f9ff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="16" r="5.5" stroke="#f0f9ff" strokeWidth="1.8" fill="none" />
    </svg>
  );
}
