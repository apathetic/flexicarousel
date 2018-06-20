export function easeInCubic(t, b, c, d) {
  return c * (t /= d) * t * t + b;
}

export function easeInOutCubic(t, b, c, d) {
  if ((t /= d / 2) < 1) { return c / 2 * t * t * t + b; }
  return c / 2 * ((t -= 2) * t * t + 2) + b;
}

export function easeInQuad(t, b, c, d) {
  return c * (t /= d) * t + b;
}

export function easeOutQuad(t, b, c, d) {
  return -c * (t /= d) * (t - 2) + b;
}

export function easeInQuart(t, b, c, d) {
  return c * (t /= d) * t * t * t + b;
}
  