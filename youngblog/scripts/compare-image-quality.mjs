/**
 * 对比原图与 WebP 变体的画质差异（用于验证「肉眼无差别」）
 *
 * 指标：
 *   PSNR    —— 峰值信噪比，>=40 dB 视为视觉无损，>=45 dB 基本无法分辨
 *   MaxDiff —— 最大单通道误差
 *   MAE     —— 平均绝对误差
 *
 * 注意：含透明的图必须按 alpha 预乘后再比较。
 *       全透明像素的 RGB 是无意义数据，直接比较会得到虚假的巨大误差
 *       （最初用朴素比较时 welcome.png 报出 255/255，就是踩了这个坑）。
 *
 * 用法: node scripts/compare-image-quality.mjs
 */
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const PAIRS = [
  ['public/assets/images/welcome.png', 'public/assets/images/welcome.webp'],
  ['public/assets/images/lantern_festival.png', 'public/assets/images/lantern_festival.webp'],
  ['public/assets/images/background/bg2.png', 'public/assets/images/background/bg2.webp'],
  ['public/assets/images/background/bg3.png', 'public/assets/images/background/bg3.webp'],
  ['public/assets/images/background/bg1.png', 'public/assets/images/background/bg1.webp'],
  ['public/assets/images/information.jpg', 'public/assets/images/information.webp'],
  ['public/assets/images/series.png', 'public/assets/images/series.webp'],
  ['public/assets/blog_bg.png', 'public/assets/blog_bg.webp'],
  ['public/assets/detail_bg.png', 'public/assets/detail_bg.webp'],
  ['public/assets/images/calendar.png', 'public/assets/images/calendar.webp'],
  ['public/assets/avatar.png', 'public/assets/avatar.webp'],
]

/** 缩放到同尺寸后取 RGBA 原始像素 */
async function rawRGBA(path, width, height) {
  return sharp(path).resize(width, height, { fit: 'fill' }).ensureAlpha().raw().toBuffer()
}

const psnrFromMse = (mse) => (mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse))

for (const [srcRel, destRel] of PAIRS) {
  const src = join(root, srcRel)
  const dest = join(root, destRel)
  const srcMeta = await sharp(src).metadata()
  const destMeta = await sharp(dest).metadata()

  const w = Math.min(srcMeta.width, destMeta.width)
  const h = Math.min(srcMeta.height, destMeta.height)

  const a = await rawRGBA(src, w, h)
  const b = await rawRGBA(dest, w, h)

  let maxDiffRgb = 0
  let maxDiffAlpha = 0
  let sumSq = 0
  let sumAbs = 0
  let n = 0

  for (let i = 0; i < a.length; i += 4) {
    const alpha = a[i + 3]
    const dAlpha = Math.abs(alpha - b[i + 3])
    if (dAlpha > maxDiffAlpha) maxDiffAlpha = dAlpha

    // 按 alpha 预乘：消除「全透明像素 RGB 无意义」带来的虚假误差
    const weight = alpha / 255
    for (let c = 0; c < 3; c += 1) {
      const d = Math.abs(a[i + c] - b[i + c]) * weight
      if (d > maxDiffRgb) maxDiffRgb = d
      sumSq += d * d
      sumAbs += d
      n += 1
    }
  }

  const mse = sumSq / n
  const mae = sumAbs / n
  const psnr = psnrFromMse(mse)
  const resized =
    srcMeta.width !== destMeta.width || srcMeta.height !== destMeta.height
      ? `  缩放 ${srcMeta.width}x${srcMeta.height} -> ${destMeta.width}x${destMeta.height}`
      : ''

  const verdict =
    psnr >= 45 ? '优秀（几乎不可分辨）' : psnr >= 40 ? '良好（视觉无损）' : '偏低，建议提高质量'

  console.log(
    `${srcRel.replace('public/', '')}\n` +
      `  对比 ${w}x${h}${resized}\n` +
      `  PSNR ${psnr === Infinity ? '∞' : psnr.toFixed(2)} dB   ` +
      `MaxDiff(RGB) ${maxDiffRgb.toFixed(1)}   MAE ${mae.toFixed(3)}   ` +
      `MaxDiff(Alpha) ${maxDiffAlpha}   -> ${verdict}`,
  )
}
