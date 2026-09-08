import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

// 定义项目根目录及关键路径常量
const ROOT = path.resolve(process.cwd());
const BLOGS_DIR = path.join(ROOT, 'blogs');
const BACKGROUND_DIR = path.join(ROOT, 'assets', 'images', 'background');
const OUTPUT_JSON = path.join(ROOT, 'public', 'data', 'blogs.json');
const SERIES_JSON = path.join(ROOT, 'public', 'data', 'series.json');
const ANNOUNCEMENTS_JSON = path.join(ROOT, 'public', 'data', 'announcements.json');
const BACKGROUND_JSON = path.join(ROOT, 'public', 'data', 'background-images.json');

// 学习分类的标签前缀集合，用于判断文章是否属于"学习"类别
const LEARNING_FIRST_TAGS = new Set(['二上', '二下', '三上', '三下', '四上', '四下', '大三']);

// 首页分类常量：学习与娱乐
const HOME_CATEGORY = {
    LEARNING: '学习',
    ENTERTAINMENT: '娱乐'
};

/**
 * 将系统路径分隔符转换为 POSIX 风格的正斜杠
 * @param {string} p - 文件系统路径
 * @returns {string} POSIX 风格的路径字符串
 */
function toPosix(p) {
    return p.split(path.sep).join('/');
}

/**
 * 将日期值标准化为有效的 Date 对象
 * 如果提供的值无效，则回退到 fallbackDate
 * @param {string|Date} value - 需要标准化的日期值
 * @param {Date} fallbackDate - 回退日期对象
 * @returns {Date} 有效的 Date 对象
 */
function normalizeDate(value, fallbackDate) {
    // 处理字符串类型的日期
    if (typeof value === 'string' && value.trim()) {
        let d = new Date(value);
        // 如果解析失败且字符串包含空格，尝试替换为 'T' 以兼容 ISO 格式变体
        if (Number.isNaN(d.getTime()) && value.includes(' ')) {
            d = new Date(value.replace(' ', 'T'));
        }
        if (!Number.isNaN(d.getTime())) return d;
    }
    // 处理 Date 对象类型的日期
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    // 回退到默认日期
    return fallbackDate;
}

/**
 * 将 Date 对象格式化为 YYYY-MM-DD 字符串
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串 (YYYY-MM-DD)
 */
function formatDateYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * 根据文章的标签数组解析其首页分类
 * 默认返回"娱乐"，除非第一个标签命中学习标签集合
 * @param {string[]} tags - 文章标签数组
 * @returns {string} 分类名称（"学习" 或 "娱乐"）
 */
function resolveHomeCategoryByTags(tags) {
    const firstTag = Array.isArray(tags) && typeof tags[0] === 'string' ? tags[0].trim() : '';
    if (LEARNING_FIRST_TAGS.has(firstTag)) {
        return HOME_CATEGORY.LEARNING;
    }
    return HOME_CATEGORY.ENTERTAINMENT;
}

/**
 * 标准化系列名称字段
 * 支持 string、string[] 或 { title, name } 对象等多种格式
 * @param {*} value - frontmatter 中的 series 字段值
 * @returns {string} 标准化后的系列名称字符串
 */
function normalizeSeries(value) {
    // 字符串类型直接返回修剪后的值
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }

    // 数组类型：取第一个有效的字符串元素
    if (Array.isArray(value)) {
        const firstValid = value.find(item => typeof item === 'string' && item.trim());
        return firstValid ? firstValid.trim() : '';
    }

    // 对象类型：尝试提取 title 或 name 属性
    if (value && typeof value === 'object') {
        if (typeof value.title === 'string' && value.title.trim()) return value.title.trim();
        if (typeof value.name === 'string' && value.name.trim()) return value.name.trim();
    }

    // 无法识别，返回空字符串
    return '';
}

/**
 * 标准化章节字段为修剪后的字符串
 * @param {*} value - frontmatter 中的 chapter 字段值
 * @returns {string} 标准化后的章节字符串
 */
function normalizeChapter(value) {
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }
    return '';
}

/**
 * 解析章节字段，提取序号、标题及是否有章节信息
 * 支持的格式示例："1 - 引言" 或普通字符串
 * @param {*} value - frontmatter 中的 chapter 字段值
 * @returns {{raw: string, order: number, title: string, hasChapter: boolean}} 解析结果对象
 */
function parseChapter(value) {
    const raw = normalizeChapter(value);
    // 无章节信息时返回默认值
    if (!raw) {
        return {
            raw: '',
            order: Number.POSITIVE_INFINITY,
            title: '',
            hasChapter: false
        };
    }

    // 匹配 "数字 - 标题" 格式
    const match = raw.match(/^(\d+)\s*-\s*(.+)$/);
    if (match) {
        return {
            raw,
            order: Number(match[1]),
            title: match[2].trim(),
            hasChapter: true
        };
    }

    // 纯文本视为标题，序号设为无穷大以排在最后
    return {
        raw,
        order: Number.POSITIVE_INFINITY,
        title: raw,
        hasChapter: true
    };
}

/**
 * 标准化排序字段，返回整数或 null
 * @param {*} value - frontmatter 中的 order 字段值
 * @returns {number|null} 标准化后的整数排序值，或 null
 */
function normalizeOrder(value) {
    // 数字类型直接截断取整
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
    }

    // 字符串类型尝试解析为数字
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed)) {
            return Math.trunc(parsed);
        }
    }

    return null;
}

/**
 * 系列内文章的排序比较函数
 * 排序优先级：有章节 > 无章节 > 章节序号 > 章节标题 > order 字段 > 日期倒序
 * @param {object} a - 文章 A
 * @param {object} b - 文章 B
 * @returns {number} 比较结果（负数表示 a 在 b 前）
 */
function compareSeriesPosts(a, b) {
    // 解析双方的章节信息
    const aChapter = parseChapter(a?.chapter);
    const bChapter = parseChapter(b?.chapter);

    // 处理章节存在性（有章节的排在前面）
    if (aChapter.hasChapter || bChapter.hasChapter) {
        if (aChapter.hasChapter && !bChapter.hasChapter) return -1;
        if (!aChapter.hasChapter && bChapter.hasChapter) return 1;
        // 按章节序号升序排列
        if (aChapter.order !== bChapter.order) return aChapter.order - bChapter.order;
        // 序号相同时按章节标题的中文拼音排序
        if (aChapter.title !== bChapter.title) return aChapter.title.localeCompare(bChapter.title, 'zh-CN');
    }

    // 处理 order 字段（有 order 的排在前面）
    const aHasOrder = Number.isFinite(a?.order);
    const bHasOrder = Number.isFinite(b?.order);
    if (aHasOrder && bHasOrder) {
        if (a.order !== b.order) return a.order - b.order;
        // order 相同时按日期倒序
        return new Date(b.date) - new Date(a.date);
    }
    if (aHasOrder && !bHasOrder) return -1;
    if (!aHasOrder && bHasOrder) return 1;

    // 默认按日期倒序排列
    return new Date(b.date) - new Date(a.date);
}

/**
 * 检查命令行参数，如果提供了公告消息则追加到 announcements.json
 * 公告格式：{ id: timestamp, date: 'YYYY-MM-DD', message: '...' }
 * @returns {Promise<boolean>} 是否成功添加了公告
 */
async function appendAnnouncementIfProvided() {
    // 获取命令行中除脚本名外的所有参数，拼接为公告内容
    const args = process.argv.slice(2).map(a => String(a)).filter(Boolean);
    const message = args.join(' ').trim();
    if (!message) return false;

    // 构建新的公告条目
    const now = new Date();
    const date = formatDateYYYYMMDD(now);
    const item = {
        id: Date.now(),
        date,
        message
    };

    // 读取现有公告列表，如果文件不存在或格式错误则初始化为空数组
    let existing = [];
    try {
        const raw = await fs.readFile(ANNOUNCEMENTS_JSON, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) existing = parsed;
    } catch (e) {
        existing = [];
    }

    // 将新公告插入列表头部并写入文件
    existing.unshift(item);
    await fs.mkdir(path.dirname(ANNOUNCEMENTS_JSON), { recursive: true });
    await fs.writeFile(ANNOUNCEMENTS_JSON, JSON.stringify(existing, null, 4) + '\n', 'utf8');

    console.log(`[generate] Added announcement (${date}): ${message}`);
    return true;
}

/**
 * 从 Markdown 正文中提取摘要（去除 frontmatter、标题和代码块）
 * @param {string} markdown - Markdown 原始内容
 * @param {number} [maxLen=80] - 摘要最大长度
 * @returns {string} 提取的纯文本摘要
 */
function extractExcerpt(markdown, maxLen = 80) {
    // 移除 frontmatter 区域
    const noFrontMatter = markdown.replace(/^---\s*[\s\S]*?\s*---\s*/m, '');
    // 提取有效文本行（跳过标题、代码块、空行）
    const lines = noFrontMatter
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean)
        .filter(l => !l.startsWith('#'))
        .filter(l => !l.startsWith('```'));

    const first = lines[0] ?? '';
    const oneLine = first.replace(/\s+/g, ' ');
    // 截断过长的文本并添加省略号
    if (oneLine.length <= maxLen) return oneLine;
    return oneLine.slice(0, maxLen).trimEnd() + '...';
}

/**
 * 使用 FNV-1a 32位哈希算法生成稳定的数字 ID
 * 相同的输入始终产生相同的输出，确保跨构建的一致性
 * @param {string} input - 用于生成 ID 的输入字符串
 * @returns {number} 32位无符号整数 ID
 */
function stableIdFromString(input) {
    let hash = 0x811c9dc5; // FNV 偏移基准值
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193); // FNV 质数
    }
    return hash >>> 0; // 转换为无符号 32 位整数
}

/**
 * 递归遍历目录，收集所有 Markdown 文件路径
 * 自动跳过名为"模板"的目录
 * @param {string} dir - 要遍历的目录路径
 * @returns {Promise<string[]>} Markdown 文件的绝对路径数组
 */
async function listMarkdownFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // 跳过模板目录
            if (entry.name === '模板') {
                continue;
            }
            // 递归遍历子目录
            files.push(...(await listMarkdownFiles(full)));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
            // 收集 .md 文件
            files.push(full);
        }
    }

    return files;
}

/**
 * 生成背景图片清单 JSON 文件
 * 扫描 BACKGROUND_DIR 目录下的图片文件，输出相对路径数组
 * @returns {Promise<void>}
 */
async function generateBackgroundImagesManifest() {
    let entries = [];
    try {
        entries = await fs.readdir(BACKGROUND_DIR, { withFileTypes: true });
    } catch (e) {
        entries = []; // 目录不存在时静默处理
    }

    // 筛选图片文件并转换为前端可用的相对路径
    const images = entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name)
        .filter(name => /\.(png|jpe?g|webp|gif|avif)$/i.test(name))
        .sort((a, b) => a.localeCompare(b, 'zh-CN'))
        .map(name => toPosix(path.join('assets', 'images', 'background', name)));

    const payload = { images };
    await fs.mkdir(path.dirname(BACKGROUND_JSON), { recursive: true });
    await fs.writeFile(BACKGROUND_JSON, JSON.stringify(payload, null, 4) + '\n', 'utf8');

    console.log(`[generate] Wrote ${images.length} background images -> ${toPosix(path.relative(ROOT, BACKGROUND_JSON))}`);
}

/**
 * 主函数：协调整个博客数据生成流程
 * 1. 处理命令行公告追加
 * 2. 生成背景图片清单
 * 3. 扫描所有 Markdown 文件并解析元数据
 * 4. 生成博客文章 JSON 和系列 JSON 文件
 * @returns {Promise<void>}
 */
async function main() {
    const runTime = new Date();
    const runDateText = formatDateYYYYMMDD(runTime);

    // 记录上次生成时清单文件的修改时间，用于检测文件变更
    let previousManifestMtime = null;
    try {
        const manifestStat = await fs.stat(OUTPUT_JSON);
        previousManifestMtime = manifestStat.mtime;
    } catch (e) {
        previousManifestMtime = null;
    }

    // 步骤 1：处理公告追加
    await appendAnnouncementIfProvided();
    // 步骤 2：生成背景图片清单
    await generateBackgroundImagesManifest();

    // 步骤 3：读取现有的博客数据，建立 contentFile -> 博客对象的映射
    let existingBlogs = [];
    try {
        const existingRaw = await fs.readFile(OUTPUT_JSON, 'utf8');
        const parsed = JSON.parse(existingRaw);
        if (Array.isArray(parsed)) {
            existingBlogs = parsed;
        }
    } catch (e) {
        existingBlogs = [];
    }

    const existingBlogByContentFile = new Map();
    existingBlogs.forEach(item => {
        if (!item || typeof item !== 'object') return;
        const key = typeof item.contentFile === 'string' ? item.contentFile.trim() : '';
        if (key) {
            existingBlogByContentFile.set(key, item);
        }
    });

    // 步骤 4：收集所有 Markdown 文件并按文件名排序
    const mdFiles = await listMarkdownFiles(BLOGS_DIR);
    mdFiles.sort((a, b) => a.localeCompare(b, 'zh-CN'));

    const seenIds = new Set();
    const blogs = [];

    // 步骤 5：逐个处理 Markdown 文件，提取元数据
    for (const filePath of mdFiles) {
        const relFromRoot = toPosix(path.relative(ROOT, filePath));
        const raw = await fs.readFile(filePath, 'utf8');
        const stat = await fs.stat(filePath);
        const fallbackDate = stat.mtime; // 文件修改时间作为回退日期
        const existingBlog = existingBlogByContentFile.get(relFromRoot);

        // 解析 frontmatter 元数据
        const parsed = matter(raw);
        const data = parsed.data ?? {};

        // 提取标题（优先使用 frontmatter，回退到文件名）
        const title =
            (typeof data.title === 'string' && data.title.trim())
                ? data.title.trim()
                : path.basename(filePath, path.extname(filePath));

        // 处理日期：保留已有日期以保持稳定性，除非 frontmatter 明确指定了新日期
        const existingDate = (existingBlog && typeof existingBlog.date === 'string') ? existingBlog.date : '';
        const fallbackPreservedDate = normalizeDate(existingDate, fallbackDate);
        const dateObj = normalizeDate(data.date, fallbackPreservedDate);
        const date = formatDateYYYYMMDD(dateObj);

        // 检测文件在上次生成后是否被修改，若修改则记录最后编辑日期
        let lastEditedDate = null;
        if (existingBlog) {
            const modifiedSinceLastGenerate = previousManifestMtime
                ? fallbackDate.getTime() > previousManifestMtime.getTime()
                : false;
            if (modifiedSinceLastGenerate) {
                lastEditedDate = runDateText;
            }
        }

        // 提取或生成摘要
        const excerpt =
            (typeof data.excerpt === 'string' && data.excerpt.trim())
                ? data.excerpt.trim()
                : extractExcerpt(raw);

        // 从 blogs/ 下的目录结构中提取标签（最多取前3层目录）
        const relFromBlogs = toPosix(path.relative(BLOGS_DIR, filePath));
        const dirParts = relFromBlogs.split('/').slice(0, -1).filter(Boolean);
        const tags = dirParts.slice(0, 3);
        const category = resolveHomeCategoryByTags(tags);

        // 提取其他可选元数据
        const type = (typeof data.type === 'string' && data.type.trim()) ? data.type.trim() : null;
        const series = normalizeSeries(data.series);
        const order = normalizeOrder(data.order);
        const chapter = normalizeChapter(data.chapter);

        // 解析推荐标志（支持 recommended 或中文"推荐"字段）
        const recommended = Boolean(data.recommended) || Boolean(data['推荐']);

        // 生成文章 ID（优先使用 frontmatter 中的 id，否则基于文件路径哈希）
        let id = Number.isFinite(Number(data.id)) ? Number(data.id) : stableIdFromString(relFromRoot);
        // 确保 ID 唯一性
        while (seenIds.has(id)) id++;
        seenIds.add(id);

        // 构建博客文章数据对象
        const blogItem = {
            id,
            title,
            excerpt,
            date,
            image: 'assets/images/blog_bg.png',
            tags,
            category,
            type,
            series: series || null,
            order,
            chapter: chapter || null,
            contentFile: relFromRoot,
            recommended
        };

        // 如果文件在上次生成后被修改，记录最后编辑日期
        if (lastEditedDate) {
            blogItem.lastEditedDate = lastEditedDate;
        }

        blogs.push(blogItem);
    }

    // 步骤 6：按日期倒序排列所有博客文章
    blogs.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 步骤 7：写入博客文章 JSON 文件
    await fs.mkdir(path.dirname(OUTPUT_JSON), { recursive: true });
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(blogs, null, 4) + '\n', 'utf8');

    // 步骤 8：构建系列数据（按系列名称分组文章）
    const seriesMap = new Map();
    for (const blog of blogs) {
        const seriesName = (typeof blog.series === 'string') ? blog.series.trim() : '';
        if (!seriesName) continue;

        if (!seriesMap.has(seriesName)) {
            seriesMap.set(seriesName, []);
        }
        seriesMap.get(seriesName).push(blog);
    }

    // 步骤 9：格式化系列数据并排序（按文章数量降序，再按标题字母序）
    const seriesList = Array.from(seriesMap.entries())
        .map(([name, posts]) => {
            const sortedPosts = posts.slice().sort(compareSeriesPosts);

            return {
                id: stableIdFromString(`series:${name}`),
                title: name,
                coverImage: 'assets/images/background/bg2.png',
                count: sortedPosts.length,
                posts: sortedPosts.map(post => ({
                    id: post.id,
                    title: post.title,
                    date: post.date,
                    order: post.order,
                    chapter: post.chapter,
                    contentFile: post.contentFile
                }))
            };
        })
        .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return a.title.localeCompare(b.title, 'zh-CN');
        });

    // 步骤 10：写入系列 JSON 文件
    await fs.mkdir(path.dirname(SERIES_JSON), { recursive: true });
    await fs.writeFile(SERIES_JSON, JSON.stringify(seriesList, null, 4) + '\n', 'utf8');

    // 输出生成统计信息
    console.log(`[generate] Wrote ${blogs.length} posts -> ${toPosix(path.relative(ROOT, OUTPUT_JSON))}`);
    console.log(`[generate] Wrote ${seriesList.length} series -> ${toPosix(path.relative(ROOT, SERIES_JSON))}`);
}

// 执行主函数，捕获并处理未预期的错误
main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});