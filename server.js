import express from "express";
import TurndownService from "turndown";
import dotenv from "dotenv";

// 工具模块
import { initBrowser, closeBrowser, getBrowserStatus, setupPage } from "./utils/browser.js";
import { isWechatArticle, isXiaohongshu, isSspai, getSiteType } from "./utils/site-detector.js";

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
import { extractGeneralContent } from "./extractors/general.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
});

// 主要的内容提取函数
async function fetchAndParse(url, format = "json", cookies = null) {
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
  const { url, format = "json" } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "缺少URL参数",
      usage: "/api/parse?url=https://example.com&format=json|markdown|text|html",
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
    const result = await fetchAndParse(url, format);
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
  const { url, format = "json", cookies } = req.body;

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
    const result = await fetchAndParse(url, format, cookies);
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

  try {
    const result = await fetchAndParse(url, format);

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

// 根路径（API 文档）
app.get("/", (req, res) => {
  res.json({
    name: "Browser Proxy Reader",
    version: "2.0.0",
    description: "基于浏览器的内容抓取代理，支持微信公众号、小红书等动态内容",
    endpoints: {
      "GET /api/parse": {
        description: "GET 请求，适用于无需登录的网站",
        params: {
          url: "要抓取的网址（必需）",
          format: "返回格式：json(默认)|markdown|text|html",
        },
        example: "GET /api/parse?url=https://mp.weixin.qq.com/s/xxxxx&format=markdown",
      },
      "POST /api/parse": {
        description: "POST 请求，支持传入 Cookies（用于需要登录的网站）",
        body: {
          url: "要抓取的网址（必需）",
          format: "返回格式：json(默认)|markdown|text|html",
          cookies: "可选，Cookie 数组 [{ name, value, domain }]",
        },
        example: {
          url: "https://www.xiaohongshu.com/explore/xxxxx",
          format: "json",
          cookies: [{ name: "web_session", value: "xxx", domain: ".xiaohongshu.com" }],
        },
      },
      "GET /r/:url": {
        description: "简化接口，类似 jina.ai",
        params: {
          format: "返回格式：markdown(默认)|text|json",
        },
        example: "GET /r/https://example.com?format=markdown",
      },
      "GET /health": {
        description: "健康检查",
      },
    },
    supported_sites: {
      wechat: {
        name: "微信公众号",
        domain: "mp.weixin.qq.com",
        needsCookie: false,
        note: "完全支持，无需登录",
      },
      xiaohongshu: {
        name: "小红书",
        domain: "xiaohongshu.com / xhslink.com",
        needsCookie: true,
        note: "需要提供登录 Cookie。支持：标题、作者、内容、标签。暂不支持图片/视频",
      },
      sspai: {
        name: "少数派",
        domain: "sspai.com",
        needsCookie: false,
        note: "完全支持，内容已优化",
      },
      csdn: {
        name: "CSDN博客",
        domain: "blog.csdn.net",
        needsCookie: false,
        note: "完全支持，已过滤推荐文章和广告",
      },
      ithome: {
        name: "IT之家",
        domain: "ithome.com",
        needsCookie: false,
        note: "完全支持，已过滤相关文章和广告",
      },
      zol: {
        name: "中关村在线",
        domain: "zol.com.cn",
        needsCookie: false,
        note: "完全支持，已过滤推荐、广告、导航等",
      },
      zhihu: {
        name: "知乎",
        domain: "zhihu.com",
        needsCookie: true,
        note: "需要提供登录 Cookie。支持：问题、回答、文章",
      },
      general: {
        name: "其他网站",
        note: "自动识别主要内容区域",
      },
    },
    features: [
      "✅ 支持微信公众号文章抓取（jina.ai 不支持）",
      "✅ 支持小红书内容抓取（需要 Cookie）",
      "✅ 支持少数派、CSDN等技术博客（内容优化）",
      "✅ 自动过滤推荐文章、广告和无关内容",
      "✅ 支持多种输出格式（JSON、Markdown、纯文本、HTML）",
      "✅ 使用真实浏览器渲染，支持 JavaScript 动态内容",
      "✅ 支持 Cookie 登录，可访问需要登录的网站",
    ],
    documentation: {
      cookies: "查看 COOKIES.md 了解如何使用 Cookie",
      readme: "查看 README.md 了解完整使用说明",
    },
  });
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
