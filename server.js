import express from "express";
import TurndownService from "turndown";
import dotenv from "dotenv";

const ARK_API_URL = process.env.ARK_API_URL;
const ARK_MODEL = process.env.ARK_MODEL;
const ARK_API_KEY = process.env.ARK_API_KEY;
const ARK_REASONING_EFFORT = process.env.ARK_REASONING_EFFORT;

// 工具模块
import { initBrowser, closeBrowser, getBrowserStatus, setupPage } from "./utils/browser.js";
import { isWechatArticle, isXiaohongshu, isSspai, isFeishu, getSiteType } from "./utils/site-detector.js";

// 内容提取器
import { extractWechatContent } from "./extractors/wechat.js";
import { extractXiaohongshuContent } from "./extractors/xiaohongshu.js";
import { extractSspaiContent } from "./extractors/sspai.js";
import { extractCsdnContent } from "./extractors/csdn.js";
import { extractZhihuContent } from "./extractors/zhihu.js";
import { extractIthomeContent } from "./extractors/ithome.js";
import { extractZolContent } from "./extractors/zol.js";
import { extractJuejinContent } from "./extractors/juejin.js";
import { extractSmzdmContent } from "./extractors/smzdm.js";
import { extractGithubContent } from "./extractors/github.js";
import { extractFeishuContent } from "./extractors/feishu.js";
import { extractGeneralContent } from "./extractors/general.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
});
const ASSET_UPLOAD_API = "https://upload.orence.net/upload";
const assetUploadCache = new Map();

function isTransferableAsset(url) {
  return typeof url === "string"
    && /^https?:\/\//.test(url)
    && (
      url.includes("internal-api-drive-stream.feishu.cn")
      || url.includes("internal-api-drive-stream.feishu-pre.cn")
      || url.includes("feishu.cn/space/api/box/stream/")
      || url.includes("larksuite.com/space/api/box/stream/")
      || url.includes("mmbiz.qpic.cn")
      || url.includes("mmbiz.qlogo.cn")
      || url.includes("res.wx.qq.com")
      || url.includes("mp.weixin.qq.com/cgi-bin/showqrcode")
    );
}

function collectImageUrlsFromHtml(html = "") {
  const matches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/g);
  return Array.from(matches, (match) => match[1]);
}

function collectImageUrlsFromMarkdown(markdown = "") {
  const matches = markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g);
  return Array.from(matches, (match) => match[1]);
}

function replaceExact(value = "", from, to) {
  if (!value || !from || from === to) return value;
  return value.split(from).join(to);
}

function parseBooleanFlag(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function extractArkOutputText(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const messageContent = payload.choices?.[0]?.message?.content;
  if (typeof messageContent === "string" && messageContent.trim()) {
    return messageContent.trim();
  }

  if (Array.isArray(messageContent)) {
    const texts = messageContent
      .filter((item) => typeof item?.text === "string" && item.text.trim())
      .map((item) => item.text.trim());

    if (texts.length > 0) {
      return texts.join("\n\n").trim();
    }
  }

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload.output)) {
    return "";
  }

  const texts = [];

  for (const item of payload.output) {
    if (!Array.isArray(item?.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (typeof contentItem?.text === "string" && contentItem.text.trim()) {
        texts.push(contentItem.text.trim());
      }
    }
  }

  return texts.join("\n\n").trim();
}

async function normalizeMarkdownWithAI(markdown, html = "", metadata = {}) {
  if (!markdown || !markdown.trim()) {
    return markdown;
  }

  if (!ARK_API_KEY) {
    throw new Error("未配置 ARK_API_KEY，无法启用 AI 处理");
  }

  const prompt = [
    "请将下面抓取得到的内容整理为标准 Markdown。",
    "你会同时收到 Markdown 和 HTML，其中 HTML 仅作为结构参考，帮助恢复层级；最终输出只能基于输入内容本身，不要补写原文不存在的信息。",
    "特别注意：Markdown 中的图片链接可能已经过转存或代理替换，因此图片地址以 Markdown 为最高优先级；不要用 HTML 中的旧 src 覆盖 Markdown 中现有的图片链接。",
    "要求：",
    "1. 保留原文事实、结构、链接、图片和代码块，不要编造内容。",
    "2. 删除明显的抓取噪音、重复段落、无意义空行和异常占位文本。",
    "3. 优先参考 HTML 的层级结构，规范标题层级、列表、引用、表格、代码块与段落间距。",
    "4. 如果 Markdown 与 HTML 有轻微差异，图片链接以 Markdown 为准，其他内容以不丢失信息、结构更完整为准进行整理。",
    "5. 输出时尽量保留 Markdown 里已经存在的图片语法、图片顺序和图片 URL，不要重新改写成 HTML img 标签。",
    "6. 输出必须是纯 Markdown 正文，不要添加解释、前言、后记或代码围栏。",
    metadata.title ? `标题：${metadata.title}` : "",
    metadata.author ? `作者：${metadata.author}` : "",
    metadata.url ? `来源：${metadata.url}` : "",
    "",
    "【Markdown 输入】",
    markdown,
    "",
    "【HTML 参考】",
    html || "(无 HTML 参考)",
  ].filter(Boolean).join("\n");

  const response = await fetch(ARK_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ARK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ARK_MODEL,
      reasoning_effort: ARK_REASONING_EFFORT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || response.statusText || "AI 处理失败");
  }

  const normalizedMarkdown = extractArkOutputText(payload);
  if (!normalizedMarkdown) {
    throw new Error("AI 未返回有效 Markdown 内容");
  }

  return normalizedMarkdown;
}

function getCookieHeader(cookies = []) {
  return cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

function getExtensionFromType(contentType = "") {
  const normalizedType = contentType.split(";")[0].trim().toLowerCase();
  const mapping = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
    "image/bmp": ".bmp",
  };

  return mapping[normalizedType] || "";
}

function getFileNameFromUrl(url, contentType = "") {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).pop() || "feishu-image";
    const safeName = lastSegment.replace(/[^a-zA-Z0-9._-]/g, "-");
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(safeName);

    if (hasExtension) {
      return safeName;
    }

    const ext = getExtensionFromType(contentType);
    return `${safeName || "feishu-image"}${ext || ".bin"}`;
  } catch {
    return `feishu-image${getExtensionFromType(contentType) || ".bin"}`;
  }
}

async function uploadBufferToCos(buffer, fileName, contentType = "application/octet-stream", path = "assets/") {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: contentType || "application/octet-stream" });
  formData.append("file", blob, fileName);
  formData.append("path", path);

  const response = await fetch(ASSET_UPLOAD_API, {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success || !payload?.fileUrl) {
    throw new Error(payload?.message || response.statusText || "上传失败");
  }

  return payload.fileUrl;
}

async function downloadAndUploadAsset(page, url, uploadPath = "assets/") {
  if (!isTransferableAsset(url)) {
    return url;
  }

  const cacheKey = `${uploadPath}:${url}`;
  if (assetUploadCache.has(cacheKey)) {
    return assetUploadCache.get(cacheKey);
  }

  try {
    const [cookies, userAgent] = await Promise.all([
      page.cookies(url),
      page.evaluate(() => navigator.userAgent),
    ]);

    const response = await fetch(url, {
      headers: {
        Cookie: getCookieHeader(cookies),
        Referer: page.url(),
        "User-Agent": userAgent,
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();
    const fileName = getFileNameFromUrl(url, contentType);
    const uploadedUrl = await uploadBufferToCos(arrayBuffer, fileName, contentType, uploadPath);

    assetUploadCache.set(cacheKey, uploadedUrl);
    return uploadedUrl;
  } catch (error) {
    console.warn("资源下载上传失败，保留原地址:", error.message);
    assetUploadCache.set(cacheKey, url);
    return url;
  }
}

async function replaceSiteAssets(page, extractedData, result, uploadPath = "assets/") {
  const candidates = Array.from(new Set([
    ...collectImageUrlsFromHtml(extractedData.html),
    ...collectImageUrlsFromMarkdown(result.markdown),
    extractedData.coverImage,
    result.coverImage,
  ].filter(isTransferableAsset)));

  if (candidates.length === 0) {
    return;
  }

  const uploadedUrls = await Promise.all(
    candidates.map((originalUrl) => downloadAndUploadAsset(page, originalUrl, uploadPath))
  );

  for (let i = 0; i < candidates.length; i += 1) {
    const originalUrl = candidates[i];
    const uploadedUrl = uploadedUrls[i];

    extractedData.html = replaceExact(extractedData.html, originalUrl, uploadedUrl);
    extractedData.coverImage = replaceExact(extractedData.coverImage, originalUrl, uploadedUrl);
    result.html = replaceExact(result.html, originalUrl, uploadedUrl);
    result.coverImage = replaceExact(result.coverImage, originalUrl, uploadedUrl);
    result.markdown = replaceExact(result.markdown, originalUrl, uploadedUrl);
  }
}

// 添加CORS支持
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  
  // 处理OPTIONS预检请求
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  
  next();
});

// 主要的内容提取函数
async function fetchAndParse(url, format = "json", cookies = null, options = {}) {
  const { ai = false } = options;
  const browserInstance = await initBrowser();
  const page = await browserInstance.newPage();

  try {
    // 配置页面（用户代理、反爬虫设置等）
    await setupPage(page);

    console.log(`正在访问: ${url}`);

    // 处理小红书短链接
    if (url.includes("xhslink.com")) {
      console.log("检测到小红书短链接，正在获取真实URL...");
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const realUrl = page.url();
      console.log(`真实URL: ${realUrl}`);

      if (realUrl.includes("xiaohongshu.com") && cookies) {
        console.log("设置小红书 Cookies...");
        await page.setCookie(...cookies);
        await page.goto(realUrl, { waitUntil: "networkidle2", timeout: 30000 });
      }

      url = realUrl;
    } else {
      // 为小红书设置 cookies
      if (isXiaohongshu(url) && cookies) {
        console.log("访问小红书首页设置 Cookies...");
        await page.goto("https://www.xiaohongshu.com/", {
          waitUntil: "networkidle2",
          timeout: 30000,
        });
        await page.setCookie(...cookies);
        console.log(`已设置 ${cookies.length} 个 Cookies`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else if (cookies) {
        await page.setCookie(...cookies);
      }

      // 访问URL
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    }

    // 根据网站类型等待内容加载
    if (isWechatArticle(url)) {
      console.log("检测到微信公众号文章，等待内容加载...");
      await page
        .waitForSelector("#js_content, .rich_media_content", { timeout: 10000 })
        .catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else if (isXiaohongshu(url)) {
      console.log("检测到小红书链接，等待内容加载...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else if (isFeishu(url)) {
      console.log("检测到飞书文档，等待内容加载...");
      await page
        .waitForSelector(".note-title__input-text, .page-block-children, .page-block.root-block", { timeout: 15000 })
        .catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 根据网站类型选择提取器
    let extractedData;
    const siteType = getSiteType(url);

    switch (siteType) {
      case "wechat":
        extractedData = await extractWechatContent(page);
        break;
      case "xiaohongshu":
        extractedData = await extractXiaohongshuContent(page);
        if (extractedData.needsLogin) {
          return {
            url,
            success: false,
            error: "小红书需要登录才能访问内容",
            message: "请提供小红书的 Cookie 以获取内容",
            hint: "使用 POST /api/parse 并在 body 中传入 cookies 参数",
          };
        }
        break;
      case "sspai":
        extractedData = await extractSspaiContent(page);
        break;
      case "csdn":
        extractedData = await extractCsdnContent(page);
        break;
      case "ithome":
        extractedData = await extractIthomeContent(page);
        break;
      case "zol":
        extractedData = await extractZolContent(page);
        break;
      case "juejin":
        extractedData = await extractJuejinContent(page);
        break;
      case "smzdm":
        extractedData = await extractSmzdmContent(page);
        break;
      case "github":
        extractedData = await extractGithubContent(page);
        break;
      case "zhihu":
        extractedData = await extractZhihuContent(page);
        if (extractedData.needsLogin) {
          return {
            url,
            success: false,
            error: "知乎需要登录才能访问内容",
            message: "请提供知乎的 Cookie 以获取内容",
            hint: "使用 POST /api/parse 并在 body 中传入 cookies 参数",
          };
        }
        break;
      case "feishu":
        extractedData = await extractFeishuContent(page);
        break;
      default:
        extractedData = await extractGeneralContent(page, url);
    }

    // 构建返回结果
    let result = {
      url,
      success: true,
      ...extractedData,
    };

    // 生成 markdown 格式
    if (extractedData.html) {
      try {
        result.markdown = turndownService.turndown(extractedData.html);

        // 小红书特殊处理：清理标签链接
        if (isXiaohongshu(url) && extractedData.tags?.length > 0) {
          result.markdown = result.markdown
            .replace(/\[#[^\]]+\]\([^)]+\)/g, "")
            .trim();
          result.markdown += "\n\n" + extractedData.tags.join(" ");
        }
        
        // 检查markdown是否为空或太短，如果是则使用content作为备用
        if (!result.markdown || result.markdown.length < 100) {
          result.markdown = extractedData.content || "";
        }
      } catch (error) {
        console.log("Markdown转换失败，使用纯文本内容:", error.message);
        // 转换失败时使用content作为备用
        result.markdown = extractedData.content || "";
      }
    } else if (extractedData.content) {
      // 如果没有html但有content，直接使用content作为markdown
      result.markdown = extractedData.content;
    }

    if (isFeishu(url)) {
      await replaceSiteAssets(page, extractedData, result, "feishu/");
    }

    if (isWechatArticle(url)) {
      await replaceSiteAssets(page, extractedData, result, "wechat/");
    }

    if (ai && result.markdown) {
      result.markdown = await normalizeMarkdownWithAI(result.markdown, extractedData.html, {
        url,
        title: extractedData.title,
        author: extractedData.author,
      });
    }

    // 根据格式返回数据
    if (format === "markdown") {
      const response = {
        url,
        title: extractedData.title,
        author: extractedData.author,
        markdown: result.markdown,
        tags: extractedData.tags || [],
      };
      
      // 添加GitHub特有字段
      if (extractedData.stars) response.stars = extractedData.stars;
      if (extractedData.forks) response.forks = extractedData.forks;
      if (extractedData.language) response.language = extractedData.language;
      if (extractedData.releases) response.releases = extractedData.releases;
      if (extractedData.description) response.description = extractedData.description;
      
      // 添加什么值得买特有字段
      if (extractedData.price) response.price = extractedData.price;
      
      return response;
    } else if (format === "text") {
      const response = {
        url,
        title: extractedData.title,
        author: extractedData.author,
        content: extractedData.content,
        tags: extractedData.tags || [],
      };
      
      // 添加额外字段
      if (extractedData.stars) response.stars = extractedData.stars;
      if (extractedData.forks) response.forks = extractedData.forks;
      if (extractedData.releases) response.releases = extractedData.releases;
      if (extractedData.price) response.price = extractedData.price;
      
      return response;
    } else if (format === "html") {
      const response = {
        url,
        title: extractedData.title,
        author: extractedData.author,
        html: extractedData.html,
        tags: extractedData.tags || [],
      };
      
      // 添加额外字段
      if (extractedData.stars) response.stars = extractedData.stars;
      if (extractedData.forks) response.forks = extractedData.forks;
      if (extractedData.releases) response.releases = extractedData.releases;
      if (extractedData.price) response.price = extractedData.price;
      
      return response;
    }

    return result;
  } catch (error) {
    console.error("抓取错误:", error.message);
    throw error;
  } finally {
    await page.close();
  }
}

// 中间件
app.use(express.json());

// 健康检查接口
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    browserStatus: getBrowserStatus(),
  });
});

// GET 接口
app.get("/api/parse", async (req, res) => {
  const { url, format = "json", ai = "false" } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "缺少URL参数",
      usage: "/api/parse?url=https://example.com&format=json|markdown|text|html&ai=true|false",
    });
  }

  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({
      success: false,
      error: "无效的URL格式",
    });
  }

  try {
    const result = await fetchAndParse(url, format, null, { ai: parseBooleanFlag(ai) });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST 接口（支持 Cookies）
app.post("/api/parse", async (req, res) => {
  const { url, format = "json", cookies, ai = false } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "缺少URL参数",
    });
  }

  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({
      success: false,
      error: "无效的URL格式",
    });
  }

  try {
    const result = await fetchAndParse(url, format, cookies, { ai: parseBooleanFlag(ai) });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 简化接口（兼容 jina.ai）
app.get("/r/:url(*)", async (req, res) => {
  const url = req.params.url;
  const format = req.query.format || "markdown";
  const ai = req.query.ai || "false";

  try {
    const result = await fetchAndParse(url, format, null, { ai: parseBooleanFlag(ai) });

    if (format === "markdown") {
      res.type("text/plain").send(result.markdown);
    } else if (format === "text") {
      res.type("text/plain").send(result.content);
    } else {
      res.json(result);
    }
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// 根路径（首页）
app.get("/", (req, res) => {
  const protocol = req.headers["x-forwarded-proto"]?.split(",")[0] || req.protocol;
  const baseUrl = `${protocol}://${req.get("host")}`;
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Browser Proxy Reader</title>
    <meta
      name="description"
      content="基于 Node.js 与 Puppeteer 的内容抓取服务，支持微信公众号、飞书、GitHub、小红书等站点，并可选 AI Markdown 标准化。"
    />
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
  </head>
  <body class="min-h-screen bg-slate-950 text-slate-100">
    <div class="absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"></div>
      <div class="absolute right-0 top-40 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl"></div>
      <div class="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"></div>
    </div>

    <main class="mx-auto max-w-7xl px-5 py-6 md:px-8 lg:px-10">
      <section class="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-8">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200">
              <i class="fa-solid fa-sparkles"></i>
              Browser Proxy Reader
            </div>
            <h1 class="text-3xl font-black tracking-tight text-white md:text-5xl">
              把网页内容提取成
              <span class="bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400 bg-clip-text text-transparent">干净、结构化、可直接使用</span>
              的数据
            </h1>
            <p class="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              基于 Node.js 与 Puppeteer 的浏览器抓取服务，支持微信公众号、飞书、GitHub、小红书、知乎等站点，输出 JSON、Markdown、Text、HTML，并支持 AI 对 Markdown 再整理为标准 md。
            </p>

            <div class="mt-6 flex flex-wrap gap-3">
              <a
                href="/health"
                class="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                <i class="fa-solid fa-heart-pulse"></i>
                健康检查
              </a>
              <a
                href="${baseUrl}/api/parse?url=https://github.com/langgenius/dify&format=json"
                class="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <i class="fa-solid fa-code"></i>
                试一个示例 API
              </a>
            </div>
          </div>

          <div class="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-xl shadow-black/20">
            <div class="mb-3 flex items-center justify-between">
              <div>
                <div class="text-xs font-medium text-slate-400">快速调用</div>
                <div class="text-base font-semibold text-white">GET /api/parse</div>
              </div>
              <div class="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                online
              </div>
            </div>
            <div class="rounded-2xl bg-slate-900 p-4 font-mono text-xs leading-6 text-slate-200 md:text-sm">
              <div class="text-slate-500"># 微信公众号 + AI 标准化</div>
              <div>GET ${baseUrl}/api/parse?url=https://mp.weixin.qq.com/s/xxxxx&amp;format=markdown&amp;ai=true</div>
              <br />
              <div class="text-slate-500"># 飞书文档</div>
              <div>GET ${baseUrl}/api/parse?url=https://your.feishu.cn/wiki/xxxxx&amp;format=markdown</div>
              <br />
              <div class="text-slate-500"># 简化接口</div>
              <div>GET ${baseUrl}/r/https://github.com/langgenius/dify?format=json</div>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-8 grid gap-6 lg:grid-cols-3">
        <div class="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl lg:col-span-2">
          <div class="mb-5 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300">
              <i class="fa-solid fa-globe"></i>
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">支持的网站</h2>
              <p class="text-sm text-slate-400">覆盖常见内容站点与通用网页抓取。</p>
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            ${[
              ["微信公众号", "fa-brands fa-weixin", "无需登录 · 正文 / 作者 / 封面图"],
              ["飞书文档", "fa-solid fa-file-lines", "支持正文、图片与 Markdown 输出"],
              ["GitHub", "fa-brands fa-github", "README / Stars / Forks / Releases"],
              ["掘金", "fa-solid fa-bolt", "技术文章与标签提取"],
              ["小红书", "fa-solid fa-book-open", "需 Cookie · 标题 / 作者 / 正文"],
              ["知乎", "fa-solid fa-circle-question", "需 Cookie · 问答 / 文章"],
              ["CSDN / IT之家 / ZOL", "fa-solid fa-newspaper", "过滤广告与推荐，保留正文"],
              ["少数派 / 什么值得买", "fa-solid fa-layer-group", "内容优化与商品信息提取"],
              ["通用网站", "fa-solid fa-wand-magic-sparkles", "自动识别主要内容区域"],
            ].map(([title, icon, desc]) => `
              <div class="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-cyan-300">
                    <i class="${icon}"></i>
                  </div>
                  <div class="text-sm font-semibold text-white">${title}</div>
                </div>
                <div class="mt-3 text-xs leading-6 text-slate-400">${desc}</div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div class="mb-5 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-fuchsia-400/15 text-fuchsia-300">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">核心能力</h2>
              <p class="text-sm text-slate-400">面向生产可用的抓取流程。</p>
            </div>
          </div>
          <div class="space-y-3">
            ${[
              ["真实浏览器渲染", "使用 Puppeteer 驱动页面，支持动态内容加载。"],
              ["AI Markdown 标准化", "可选对抓取结果二次整理，提升 Markdown 结构质量。"],
              ["图片转存替换", "飞书与微信图片支持下载再上传，输出外链可访问图床地址。"],
            ].map(([title, desc]) => `
              <div class="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <div class="text-sm font-semibold text-white">${title}</div>
                <div class="mt-2 text-xs leading-6 text-slate-400">${desc}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <section class="mt-8 grid gap-6 lg:grid-cols-2">
        <div class="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
              <i class="fa-solid fa-circle-info"></i>
            </div>
            <h2 class="text-xl font-bold text-white">URL 文档说明</h2>
          </div>
          <div class="space-y-4 text-xs leading-6 text-slate-300 md:text-sm">
            <div class="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div class="font-semibold text-white">GET /api/parse</div>
              <div class="mt-2 text-slate-400">标准抓取接口，适合无需登录的网站。</div>
              <div class="mt-3 rounded-xl bg-slate-950 px-3 py-2 font-mono text-[11px] text-slate-200 md:text-xs">${baseUrl}/api/parse?url=https://example.com&amp;format=markdown&amp;ai=true</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div class="font-semibold text-white">POST /api/parse</div>
              <div class="mt-2 text-slate-400">支持传入 Cookie，适合小红书、知乎等需登录场景。</div>
              <div class="mt-3 rounded-xl bg-slate-950 px-3 py-2 font-mono text-[11px] text-slate-200 md:text-xs">{ "url": "https://example.com", "format": "markdown", "ai": true, "cookies": [] }</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div class="font-semibold text-white">GET /r/:url</div>
              <div class="mt-2 text-slate-400">简化接口，类似 jina.ai，适合快速透传抓取。</div>
              <div class="mt-3 rounded-xl bg-slate-950 px-3 py-2 font-mono text-[11px] text-slate-200 md:text-xs">${baseUrl}/r/https://example.com?format=markdown&amp;ai=true</div>
            </div>
          </div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300">
              <i class="fa-solid fa-link"></i>
            </div>
            <h2 class="text-xl font-bold text-white">参数说明</h2>
          </div>
          <div class="space-y-3 text-xs leading-6 text-slate-300 md:text-sm">
            <div class="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
              <span class="font-semibold text-white">url</span>
              <span class="text-slate-400"> — 必填，要抓取的完整网页地址。</span>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
              <span class="font-semibold text-white">format</span>
              <span class="text-slate-400"> — 可选，支持 </span>
              <span class="font-mono text-white">json</span>
              <span class="text-slate-400"> / </span>
              <span class="font-mono text-white">markdown</span>
              <span class="text-slate-400"> / </span>
              <span class="font-mono text-white">text</span>
              <span class="text-slate-400"> / </span>
              <span class="font-mono text-white">html</span>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
              <span class="font-semibold text-white">ai</span>
              <span class="text-slate-400"> — 可选，</span>
              <span class="font-mono text-white">true</span>
              <span class="text-slate-400"> 时会对 Markdown 再执行一次 AI 标准化。</span>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
              <span class="font-semibold text-white">cookies</span>
              <span class="text-slate-400"> — 仅 POST 使用，可传 Cookie 数组访问需登录内容。</span>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
              <span class="font-semibold text-white">GET /health</span>
              <span class="text-slate-400"> — 健康检查接口，用于查看服务与浏览器状态。</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>`;

  res.type("html").send(html);
});

// 优雅关闭处理函数
async function gracefulShutdown(signal) {
  console.log(`\n收到 ${signal} 信号，正在关闭服务器...`);
  await closeBrowser();
  process.exit(0);
}

// 监听各种退出信号
process.on("SIGINT", () => gracefulShutdown("SIGINT"));   // Ctrl+C
process.on("SIGTERM", () => gracefulShutdown("SIGTERM")); // 系统终止
process.on("SIGHUP", () => gracefulShutdown("SIGHUP"));   // 终端关闭

// 处理未捕获的异常
process.on("uncaughtException", async (error) => {
  console.error("未捕获的异常:", error);
  await closeBrowser();
  process.exit(1);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📖 API文档: http://localhost:${PORT}/`);
  console.log(`🔍 测试接口: http://localhost:${PORT}/health`);

  // 预启动浏览器
  initBrowser().then(() => {
    console.log("✅ 浏览器预热完成");
  });
});
