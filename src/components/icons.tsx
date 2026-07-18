import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function createIcon(paths: React.ReactNode) {
  return function Icon({ className = 'h-5 w-5', ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        {paths}
      </svg>
    )
  }
}

export const HomeIcon = createIcon(
  <>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </>,
)

export const CartIcon = createIcon(
  <>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M3 4h2l2.2 11.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L21 8H6" />
  </>,
)

export const BoxIcon = createIcon(
  <>
    <path d="M21 8 12 3 3 8l9 5 9-5Z" />
    <path d="M3 8v9l9 5 9-5V8" />
    <path d="M12 13v9" />
  </>,
)

export const UserIcon = createIcon(
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </>,
)

export const UsersIcon = createIcon(
  <>
    <circle cx="9" cy="8" r="3" />
    <path d="M2.5 19a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.5a3 3 0 0 1 0 6" />
    <path d="M17.5 13a6.5 6.5 0 0 1 4 6" />
  </>,
)

export const TruckIcon = createIcon(
  <>
    <path d="M3 7h11v9H3z" />
    <path d="M14 10h4l3 3v3h-7" />
    <circle cx="7" cy="18.5" r="1.6" />
    <circle cx="17.5" cy="18.5" r="1.6" />
  </>,
)

export const BagIcon = createIcon(
  <>
    <path d="M6 8h12l1 12H5L6 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </>,
)

export const ChartIcon = createIcon(
  <>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M22 20H2" />
  </>,
)

export const GearIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.5-2-3.4-2.3.6a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2.7a7.6 7.6 0 0 0-2.6 1.5l-2.3-.6-2 3.4L4.6 10.5a7.6 7.6 0 0 0 0 3l-1.9 1.5 2 3.4 2.3-.6a7.6 7.6 0 0 0 2.6 1.5L10 22h4l.4-2.7a7.6 7.6 0 0 0 2.6-1.5l2.3.6 2-3.4-1.9-1.5Z" />
  </>,
)

export const BuildingIcon = createIcon(
  <>
    <path d="M4 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16" />
    <path d="M12 10h7a1 1 0 0 1 1 1v10" />
    <path d="M8 8h0M8 12h0M8 16h0" />
    <path d="M16 14h0M16 18h0" />
  </>,
)

export const ChevronLeftIcon = createIcon(<path d="M14.5 5 8 12l6.5 7" />)
export const ChevronRightIcon = createIcon(<path d="M9.5 5 16 12l-6.5 7" />)
export const ChevronDownIcon = createIcon(<path d="M5 8.5 12 15l7-6.5" />)

export const SearchIcon = createIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </>,
)

export const LogOutIcon = createIcon(
  <>
    <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </>,
)

export const SunIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
)

export const MoonIcon = createIcon(<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />)

export const MenuIcon = createIcon(
  <>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </>,
)

export const XIcon = createIcon(
  <>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </>,
)
