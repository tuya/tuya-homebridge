import convert from 'color-convert';
import kelvinToRgb from 'kelvin-to-rgb';

export function kelvinToHSV(kevin: number) {
  const [r, g, b] = kelvinToRgb(kevin);
  const [h, s, v] = convert.rgb.hsv(r, g, b);
  return { h, s, v };
}

// https://en.wikipedia.org/wiki/Mired
export function kelvinToMired(kelvin: number) {
  return 1e6 / kelvin;
}

export function miredToKelvin(mired: number) {
  return 1e6 / mired;
}
