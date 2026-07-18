type CapsulaLogoProps = {
  className?: string
}

/**
 * Logo de la marca "Cápsula": aro cian con un corte (forma de C),
 * reutilizado en Login, sidebar del panel y header del POS.
 */
export function CapsulaLogo({ className = 'h-8 w-8' }: CapsulaLogoProps) {
  return (
    <svg viewBox="0 0 100 100" className={`shrink-0 ${className}`}>
      <circle
        cx="50"
        cy="50"
        r="35"
        stroke="#22d3ee"
        strokeWidth="12"
        fill="none"
        strokeDasharray="170 100"
        strokeLinecap="round"
        transform="rotate(-45 50 50)"
      />
    </svg>
  )
}
