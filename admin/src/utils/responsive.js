const s = (size) => `${(size / 375) * 100}vw`
const vs = (size) => `${(size / 812) * 100}vh`
const ms = (size, factor = 0.5) => {
  const base = (size / 375) * 100
  const scaled = size + (base - size) * factor
  return `clamp(${size * 0.7}px, ${scaled}px, ${size * 1.3}px)`
}
const hp = (percentage) => `${percentage}vh`
const wp = (percentage) => `${percentage}vw`

export { s, vs, ms, hp, wp }
