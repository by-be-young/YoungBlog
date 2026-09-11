/**
 * 图片优化脚本：为静态图片生成 WebP 变体
 * ------------------------------------------------------------------
 * 背景：站点首屏需要预载的图片一度占到 15 MB（图片占总体积的 97%），
 *       其中多张是「照片却按 PNG 存储」，约 1.7~2.2 字节/像素，
 *       而 WebP 通常只要 0.05~0.15 字节/像素，画质肉眼无差别。
 *
 * 做法：读取 public/ 下的原始图片，按显示尺寸上限等比缩放后编码为 WebP，
 *       输出到同目录同名 .webp 文件（保留原图作为回退，不做删除）。
 *
 * 用法：
 *   npm run optimize:images          # 生成缺失的 .webp
 *   npm run optimize:images -- --force   # 全部重新生成
 *
 * 新增图片时，在下方 MANIFEST 里补一条即可。
 */
import { stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

/**
 * 优化清单
 *  - file:     相对仓库根目录的路径
 *  - maxWidth: 缩放上限（null 表示保持原始尺寸，仅重新编码）
 *              取值原则：不小于「最大显示宽度 × 2（高清屏）」，因此放大后仍看不出差别
 *  - quality:  WebP 质量，默认 90（对本类图片属视觉无损档）
 *  - skip:     true 表示保持原图，不生成 WebP（原图已经是更优格式时用）
 *  - note:     该图在页面上的用途，便于日后判断参数是否合理
 */
const MANIFEST = [
    // ---------- 首页首屏（入场加载器会预载，直接决定加载时长） ----------
    {
        file: 'public/assets/images/welcome.png',
        maxWidth: 2688,
        note: 'Hero 云朵主视觉（原 4096×2048）',
    },
    {
        file: 'public/assets/images/lantern_festival.png',
        maxWidth: 1200,
        note: '博客卡片缩略图（原 2730×1535，PNG 照片）',
    },
    {
        file: 'public/assets/images/background/bg2.png',
        maxWidth: null,
        note: '背景轮播图 2（PNG 照片）',
    },
    {
        file: 'public/assets/images/background/bg3.png',
        maxWidth: null,
        note: '背景轮播图 3（PNG 照片）',
    },
    {
        file: 'public/assets/images/background/bg1.png',
        maxWidth: null,
        skip: true,
        note: '背景轮播图 1 已是高效 PNG（0.12 B/px），转 WebP 反而增大 58%',
    },
    {
        file: 'public/assets/images/information.jpg',
        maxWidth: 720,
        note: '资料卡信息背景（原 1080×2100）',
    },
    { file: 'public/assets/avatar.png', maxWidth: null, note: '头像（导航栏 / 资料卡）' },

    // ---------- 其他页面的大图 ----------
    { file: 'public/assets/images/series.png', maxWidth: 1200, note: '系列页封面（原 1920×1080）' },
    { file: 'public/assets/blog_bg.png', maxWidth: null, note: '博客卡片底图（文章列表）' },
    { file: 'public/assets/detail_bg.png', maxWidth: null, note: '博客详情页 / 关于页背景' },
    { file: 'public/assets/images/calendar.png', maxWidth: null, note: '日历插图' },
    { file: 'public/assets/images/快速链接/oldjoy.png', maxWidth: 900, note: '快捷链接卡片图' },
    { file: 'public/assets/images/快速链接/hyggge.png', maxWidth: 900, note: '快捷链接卡片图' },
    { file: 'public/assets/images/快速链接/rainel.png', maxWidth: 900, note: '快捷链接卡片图' },
    { file: 'public/assets/images/快速链接/connor.png', maxWidth: 900, note: '快捷链接卡片图' },
    { file: 'public/assets/images/快速链接/yangdao.png', maxWidth: 900, note: '快捷链接卡片图' },
]

const force = process.argv.includes('--force')
const fmtKB = (bytes) => `${(bytes / 1024).toFixed(0)} KB`

async function sizeOf(path) {
    try {
        return (await stat(path)).size
    } catch {
        return null
    }
}

/** 与 compare-image-quality.mjs 相同的预乘 alpha 误差算法，保证口径一致 */
function psnrOf(reference, candidate) {
    let sumSq = 0
    let n = 0
    let maxDiff = 0
    for (let i = 0; i < reference.length; i += 4) {
        const weight = reference[i + 3] / 255
        for (let c = 0; c < 3; c += 1) {
            const d = Math.abs(reference[i + c] - candidate[i + c]) * weight
            if (d > maxDiff) maxDiff = d
            sumSq += d * d
            n += 1
        }
    }
    const mse = sumSq / n
    return { psnr: mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse), maxDiff }
}

async function decodeRGBA(input, width, height) {
    return sharp(input).resize(width, height, { fit: 'fill' }).ensureAlpha().raw().toBuffer()
}

/** 只有体积至少缩小这个比例才采用 WebP，避免「越优化越大」 */
const MIN_SAVING_RATIO = 0.2

/**
 * 优化单张图片。
 *
 * 关于画质：这里用固定高质量（默认 q90）+ alphaQuality 100。
 * 之所以不做「按 PSNR 目标自动搜质量」：
 * 照片类图片带有颗粒噪点，PSNR 会被噪点主导，即使观感完全一致也上不了 42 dB，
 * 自动搜索会一路顶到 q95 仍然「不达标」，反而把体积做大。
 * 因此改为：固定高质量 + 事后报告 PSNR + 「确实变小了才采用」的硬性兜底。
 */
async function optimizeOne(entry) {
    const src = join(root, entry.file)
    const dest = src.slice(0, -extname(src).length) + '.webp'
    const label = entry.file.replace('public/', '')

    const srcBytes = await sizeOf(src)
    if (srcBytes === null) {
        console.log(`  [跳过] ${label} —— 源文件不存在`)
        return null
    }

    if (entry.skip) {
        console.log(`  [保持原图] ${label}（${fmtKB(srcBytes)}）—— ${entry.note}`)
        return { srcBytes, destBytes: null, skipped: true }
    }

    const destBytes = await sizeOf(dest)
    if (destBytes !== null && !force) {
        console.log(
            `  [已存在] ${extname(label) ? label.replace(extname(label), '') : label}.webp (${fmtKB(destBytes)})`,
        )
        return { srcBytes, destBytes, skipped: true }
    }

    const meta = await sharp(src).metadata()
    const resized = Boolean(entry.maxWidth) && meta.width > entry.maxWidth
    const quality = entry.quality ?? 90

    const encode = (q) => {
        let pipeline = sharp(src, { failOn: 'none' })
        if (resized) pipeline = pipeline.resize({ width: entry.maxWidth, withoutEnlargement: true })
        return pipeline.webp({ quality: q, alphaQuality: 100, effort: 6 }).toBuffer()
    }

    const buf = await encode(quality)
    const outMeta = await sharp(buf).metadata()

    if (buf.length > srcBytes * (1 - MIN_SAVING_RATIO)) {
        console.log(
            `  [放弃] ${label}（${fmtKB(srcBytes)} -> ${fmtKB(buf.length)}，缩小不足 20%）—— 继续使用原图`,
        )
        return { srcBytes, destBytes: null, skipped: true, rejected: true }
    }

    await writeFile(dest, buf)

    const reference = await decodeRGBA(src, outMeta.width, outMeta.height)
    const candidate = await decodeRGBA(buf, outMeta.width, outMeta.height)
    const { psnr, maxDiff } = psnrOf(reference, candidate)

    const ratio = (1 - buf.length / srcBytes) * 100
    console.log(
        `  ${label}  ${fmtKB(srcBytes)} -> ${fmtKB(buf.length)}  (-${ratio.toFixed(1)}%)\n` +
        `      ${meta.width}x${meta.height}${resized ? ` => ${outMeta.width}x${outMeta.height}` : ''}  ` +
        `q${quality}  PSNR ${psnr.toFixed(1)} dB  MaxDiff ${maxDiff.toFixed(0)}  ${entry.note}`,
    )
    return { srcBytes, destBytes: buf.length, skipped: false }
}

console.log(`图片优化：共 ${MANIFEST.length} 项${force ? '（--force 全部重建）' : ''}\n`)

let totalSrc = 0
let totalDest = 0

for (const entry of MANIFEST) {
    const result = await optimizeOne(entry)
    if (!result) continue
    totalSrc += result.srcBytes
    totalDest += result.destBytes
}

const ratio = totalSrc > 0 ? (1 - totalDest / totalSrc) * 100 : 0
console.log(
    `\n合计：${fmtKB(totalSrc)} -> ${fmtKB(totalDest)}（-${ratio.toFixed(1)}%，节省 ${fmtKB(totalSrc - totalDest)}）`,
)
