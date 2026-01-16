import markPng from '../assets/Screenshot_2026-01-16_014804-removebg-preview.png'

export default function LifeSyncMark({ size = 22 }) {
  const px = typeof size === 'number' ? `${size}px` : size

  return (
    <img
      src={markPng}
      alt="LifeSync"
      width={px}
      height={px}
      style={{
        width: px,
        height: px,
        display: 'block',
        objectFit: 'contain',
      }}
    />
  )
}
