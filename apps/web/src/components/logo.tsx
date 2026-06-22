interface LogoProps {
  size?: number;
  className?: string;
}

export function LogoIcon({ size = 36, className = "" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Patentbrief"
    >
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2.25" />
      <circle cx="32" cy="32" r="25.5" stroke="#c8861a" strokeWidth="0.75" />
      <text
        x="32"
        y="32"
        fontFamily="Georgia, 'Times New Roman', 'Palatino Linotype', serif"
        fontSize="38"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
      >
        P
      </text>
    </svg>
  );
}

export function LogoMark({ size = 36 }: LogoProps) {
  return (
    <span className="flex items-center gap-3">
      <LogoIcon size={size} className="text-lp-ink dark:text-white shrink-0" />
      <span className="font-serif text-2xl font-bold leading-none text-lp-ink dark:text-white">
        Patentbrief
      </span>
    </span>
  );
}
