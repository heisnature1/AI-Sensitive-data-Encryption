interface BrandProps {
  compact?: boolean;
  inverse?: boolean;
}

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#173F32" />
      <path d="M20 8.5 30 12.25v7.5c0 6.55-4.05 10.48-10 12.45-5.95-1.97-10-5.9-10-12.45v-7.5L20 8.5Z" fill="#C9F27B" />
      <path d="M15 16.25v7.5M20 13.75v11.25M25 17.5v5" stroke="#173F32" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ compact = false, inverse = false }: BrandProps) {
  return (
    <div className={`brand ${inverse ? 'brand--inverse' : ''}`} aria-label="Hush home">
      <BrandMark size={36} />
      {!compact && <span className="brand__word">hush<span>.</span></span>}
    </div>
  );
}
