// 小红书内容提取器

export async function extractXiaohongshuContent(page) {
  const pageUrl = page.url();
  const pageTitle = await page.title();
  console.log(`\n========== 小红书内容提取 ==========`);
  console.log(`页面标题: ${pageTitle}`);
  console.log(`当前URL: ${pageUrl}`);

  const result = await page.evaluate(() => {
    const data = {
      title: "",
      author: "",
      content: "",
      html: "",
      tags: [],
      needsLogin: false,
    };

    // 只有在明确的登录/验证页面才返回需要登录
    if (
      (document.title.includes("安全验证") ||
        document.title.includes("登录") ||
        document.body.innerText.includes("扫码验证身份")) &&
      !document.title.includes(" - 小红书")
    ) {
      data.needsLogin = true;
      data.title = document.title;
      return data;
    }

    // 提取标题
    const titleSelectors = [
      "#detail-title",
      ".title",
      ".note-title",
      '[class*="note-title"]',
      '[class*="Title"]',
      "h1",
    ];

    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        data.title = el.textContent.trim();
        break;
      }
    }

    // 提取作者
    const authorSelectors = [
      ".username",
      ".author-name",
      ".author-container",
      '[class*="author"]',
      '[class*="username"]',
      '[class*="user-name"]',
    ];

    for (const selector of authorSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        data.author = el.textContent.trim();
        break;
      }
    }

    // 提取内容
    const contentSelectors = [
      "#detail-desc",
      ".content",
      ".note-content",
      ".desc",
      '[class*="note-text"]',
      '[class*="content"]',
      '[class*="desc"]',
    ];

    for (const selector of contentSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        data.html = el.innerHTML;
        data.content = el.innerText.trim();
        if (data.content) break;
      }
    }

    // 提取标签
    const tagElements = document.querySelectorAll(
      'a.tag, a[id="hash-tag"], [class*="tag"]'
    );
    data.tags = Array.from(tagElements)
      .map((tag) => tag.textContent.trim())
      .filter((tag) => tag.startsWith("#"))
      .slice(0, 20);

    return data;
  });

  // 打印提取结果
  console.log(`\n📝 提取结果:`);
  console.log(`- 标题: ${result.title || "未提取"}`);
  console.log(`- 作者: ${result.author || "未提取"}`);
  console.log(`- 内容长度: ${result.content ? result.content.length : 0} 字符`);
  console.log(`- 标签数量: ${result.tags ? result.tags.length : 0}`);
  if (result.tags && result.tags.length > 0) {
    console.log(`- 标签: ${result.tags.join(" ")}`);
  }
  console.log(`========================================\n`);

  return result;
}

