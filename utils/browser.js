// 浏览器管理工具

import puppeteer from "puppeteer";

let browser = null;

// 初始化浏览器
export async function initBrowser() {
  if (!browser) {
    const launchOptions = {
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920x1080",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    };

    // 如果指定了Chrome可执行文件路径，使用它
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log("使用自定义Chrome路径:", process.env.PUPPETEER_EXECUTABLE_PATH);
    }

    browser = await puppeteer.launch(launchOptions);
    console.log("浏览器实例已启动");
  }
  return browser;
}

// 关闭浏览器
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    console.log("浏览器实例已关闭");
  }
}

// 获取浏览器状态
export function getBrowserStatus() {
  return browser ? "running" : "stopped";
}

// 配置页面反爬虫设置
export async function setupPage(page) {
  // 设置用户代理
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  // 隐藏 webdriver 特征
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });

    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });

    Object.defineProperty(navigator, "languages", {
      get: () => ["zh-CN", "zh", "en"],
    });

    window.chrome = {
      runtime: {},
    };
  });

  // 设置请求头
  await page.setExtraHTTPHeaders({
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    Referer: "https://www.xiaohongshu.com/",
  });

  // 设置视口
  await page.setViewport({ width: 1920, height: 1080 });
}

