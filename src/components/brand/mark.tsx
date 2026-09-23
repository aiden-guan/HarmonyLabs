export function Mark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="2" fill="currentColor" />
      <path d="M16 7v18M7 16h18" stroke="#f4f8fb" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="5.2" stroke="#f4f8fb" strokeWidth="1.6" fill="none" />
    </svg>
  );
}
