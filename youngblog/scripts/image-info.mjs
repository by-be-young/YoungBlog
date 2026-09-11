/**
 * 读取 PNG / JPEG 图片尺寸（仅解析文件头，不依赖任何第三方库）
 * 用法: node scripts/image-info.mjs <文件...>
 */
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

function pngSize(buf) {
    // 8 字节签名 + 4 长度 + 4 类型(IHDR) + 宽4 + 高4
    if (buf.length < 24) return null
    if (buf.readUInt32BE(0) !== 0x89504e47) return null
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

function jpegSize(buf) {
    if (buf[0] !== 0xff || buf[1] !== 0xd8) return null
    let off = 2
    while (off + 9 < buf.length) {
        if (buf[off] !== 0xff) {
            off += 1
            continue
        }
        const marker = buf[off + 1]
        const len = buf.readUInt16BE(off + 2)
        // SOF0..SOF15（排除 DHT=0xc4 / JPG=0xc8 / DAC=0xcc）
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
            return { h: buf.readUInt16BE(off + 5), w: buf.readUInt16BE(off + 7) }
        }
        off += 2 + len
    }
    return null
}

for (const file of process.argv.slice(2)) {
    try {
        const buf = readFileSync(file)
        const size = pngSize(buf) || jpegSize(buf)
        const mb = (buf.length / 1024 / 1024).toFixed(2)
        if (!size) {
            console.log(`${basename(file)}\t?\t${mb} MB`)
            continue
        }
        const px = size.w * size.h
        const bytesPerPixel = buf.length / px
        console.log(
            `${basename(file)}\t${size.w}x${size.h}\t${mb} MB\t${bytesPerPixel.toFixed(2)} B/px`,
        )
    } catch (e) {
        console.log(`${basename(file)}\tERROR ${e.message}`)
    }
}
