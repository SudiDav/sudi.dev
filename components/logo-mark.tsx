import Image from 'next/image'

/** Design: "Logo Mark" — 80×33, images/sudi-logo.png, fit. */
export function LogoMark() {
  return (
    <Image
      src="/images/sudi-logo.png"
      alt="Sudi David"
      width={80}
      height={33}
      priority
      className="h-[33px] w-20 object-contain"
    />
  )
}
