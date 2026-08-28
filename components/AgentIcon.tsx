/**
 * A small robot/agent glyph drawn with `currentColor` so it inherits text color.
 * Used for the DocChat "agent" branding in the header and on assistant replies.
 */
export function AgentIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* antenna */}
      <circle cx="12" cy="2.6" r="1.3" fill="currentColor" />
      <path d="M12 3.9V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* head */}
      <rect
        x="4"
        y="6"
        width="16"
        height="12"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      {/* ears */}
      <path
        d="M4 11H2.6M21.4 11H20"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* eyes */}
      <circle cx="9.2" cy="12" r="1.35" fill="currentColor" />
      <circle cx="14.8" cy="12" r="1.35" fill="currentColor" />
      {/* mouth */}
      <path
        d="M9.5 15.2h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
