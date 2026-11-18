/**
 * 博客类型色板。
 *
 * 归档页和分类页共用这一份映射：同一个 type 在任何位置都会得到同一种
 * 卡片底纹、左侧色条和类型标签颜色。色相沿用站点已有的雾蓝、薄荷、
 * 鸢尾紫、珊瑚粉与琥珀色，只做低饱和的玻璃化处理。
 */

const TYPE_TONES = {
  系统笔记: {
    ink: '#2b6489',
    soft: 'rgba(150, 210, 240, 0.3)',
    line: 'rgba(74, 164, 214, 0.36)',
    bar: 'linear-gradient(180deg, #a9ddf6, #56b5dd)',
    wash: 'rgba(142, 203, 255, 0.1)',
    glow: 'rgba(80, 170, 220, 0.24)',
  },
  概要笔记: {
    ink: '#257461',
    soft: 'rgba(167, 243, 208, 0.3)',
    line: 'rgba(62, 190, 157, 0.32)',
    bar: 'linear-gradient(180deg, #b7f5dc, #5ed8b4)',
    wash: 'rgba(88, 216, 178, 0.09)',
    glow: 'rgba(88, 216, 178, 0.22)',
  },
  概念笔记: {
    ink: '#6651b8',
    soft: 'rgba(207, 197, 255, 0.34)',
    line: 'rgba(160, 140, 255, 0.34)',
    bar: 'linear-gradient(180deg, #ded6ff, #a08cff)',
    wash: 'rgba(160, 140, 255, 0.1)',
    glow: 'rgba(160, 140, 255, 0.24)',
  },
  待完善: {
    ink: '#936124',
    soft: 'rgba(255, 224, 178, 0.42)',
    line: 'rgba(238, 181, 105, 0.38)',
    bar: 'linear-gradient(180deg, #ffe3b8, #efb15a)',
    wash: 'rgba(255, 214, 166, 0.11)',
    glow: 'rgba(238, 181, 105, 0.24)',
  },
  轻松笔记: {
    ink: '#a84a63',
    soft: 'rgba(255, 204, 218, 0.38)',
    line: 'rgba(232, 93, 132, 0.28)',
    bar: 'linear-gradient(180deg, #ffd0dd, #e86f93)',
    wash: 'rgba(255, 182, 201, 0.1)',
    glow: 'rgba(232, 93, 132, 0.22)',
  },
  纸上行舟: {
    ink: '#3e5f9f',
    soft: 'rgba(198, 212, 255, 0.36)',
    line: 'rgba(120, 150, 220, 0.34)',
    bar: 'linear-gradient(180deg, #cedbff, #7e9adb)',
    wash: 'rgba(126, 154, 219, 0.09)',
    glow: 'rgba(126, 154, 219, 0.22)',
  },
  落笔生花: {
    ink: '#a63d5e',
    soft: 'rgba(255, 193, 210, 0.38)',
    line: 'rgba(200, 64, 112, 0.3)',
    bar: 'linear-gradient(180deg, #ffc6d7, #d94f78)',
    wash: 'rgba(232, 93, 132, 0.1)',
    glow: 'rgba(200, 64, 112, 0.24)',
  },
  随心所记: {
    ink: '#75648c',
    soft: 'rgba(226, 214, 242, 0.4)',
    line: 'rgba(180, 160, 205, 0.32)',
    bar: 'linear-gradient(180deg, #e8def6, #b7a5cc)',
    wash: 'rgba(180, 160, 205, 0.09)',
    glow: 'rgba(180, 160, 205, 0.2)',
  },
  专题笔记: {
    ink: '#4f7647',
    soft: 'rgba(205, 235, 190, 0.38)',
    line: 'rgba(126, 190, 110, 0.32)',
    bar: 'linear-gradient(180deg, #d4efd4, #86c78a)',
    wash: 'rgba(126, 190, 110, 0.09)',
    glow: 'rgba(126, 190, 110, 0.22)',
  },
  落音缤纷: {
    ink: '#9e6048',
    soft: 'rgba(255, 211, 194, 0.4)',
    line: 'rgba(240, 150, 120, 0.34)',
    bar: 'linear-gradient(180deg, #ffd9c9, #ef9c7a)',
    wash: 'rgba(240, 150, 120, 0.1)',
    glow: 'rgba(240, 150, 120, 0.22)',
  },
}

const FALLBACK_TONES = Object.values(TYPE_TONES)
const EMPTY_TONE = {
  ink: 'rgba(23, 34, 47, 0.62)',
  soft: 'rgba(23, 34, 47, 0.06)',
  line: 'rgba(23, 34, 47, 0.16)',
  bar: 'linear-gradient(180deg, #e3e9ef, #a5b2bf)',
  wash: 'rgba(23, 34, 47, 0.03)',
  glow: 'rgba(23, 34, 47, 0.12)',
}

const hashType = (value) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

const toCssVars = (tone) => ({
  '--type-ink': tone.ink,
  '--type-soft': tone.soft,
  '--type-line': tone.line,
  '--type-bar': tone.bar,
  '--type-wash': tone.wash,
  '--type-glow': tone.glow,
})

/** 返回可直接绑定到元素 style 的类型 CSS 变量。 */
export function getBlogTypeStyle(type) {
  const normalized = typeof type === 'string' ? type.trim() : ''
  if (!normalized) return toCssVars(EMPTY_TONE)
  const tone = TYPE_TONES[normalized] || FALLBACK_TONES[hashType(normalized) % FALLBACK_TONES.length]
  return toCssVars(tone)
}
