type Ink = [number, number, number]

const luminance = (d: Uint8ClampedArray, i: number) =>
  .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]

const paint = (d: Uint8ClampedArray, i: number, ink: Ink) => {
  d[i] = ink[0]
  d[i + 1] = ink[1]
  d[i + 2] = ink[2]
  d[i + 3] = 255
}

const mono = (image: ImageData) => {
  const values = new Float32Array(image.width * image.height)
  for (let p = 0; p < values.length; p++) values[p] = luminance(image.data, p * 4)
  return values
}

export const ink = (color: string): Ink => {
  const value = color.trim()
  if (value === "#000" || value === "rgb(0, 0, 0)") return [0, 0, 0]
  return [255, 255, 255]
}

export function bayer(image: ImageData, size: 4 | 8, fg: Ink, bg: Ink) {
  const matrix = size === 4
    ? [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
    : [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21]
  const values = mono(image)
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const p = y * image.width + x
    const threshold = (matrix[(y % size) * size + x % size] + .5) * 255 / (size * size)
    paint(image.data, p * 4, values[p] < threshold ? fg : bg)
  }
  return image
}

function diffuse(image: ImageData, fg: Ink, bg: Ink, kernel: number[][], divisor: number) {
  const values = mono(image)
  const { width, height, data } = image
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y * width + x
    const next = values[p] < 128 ? 0 : 255
    const error = values[p] - next
    paint(data, p * 4, next ? bg : fg)
    for (const [dx, dy, weight] of kernel) {
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && nx < width && ny < height) values[ny * width + nx] += error * weight / divisor
    }
  }
  return image
}

export const floydSteinberg = (image: ImageData, fg: Ink, bg: Ink) =>
  diffuse(image, fg, bg, [[1,0,7],[-1,1,3],[0,1,5],[1,1,1]], 16)

export const atkinson = (image: ImageData, fg: Ink, bg: Ink) =>
  diffuse(image, fg, bg, [[1,0,1],[2,0,1],[-1,1,1],[0,1,1],[1,1,1],[0,2,1]], 8)
