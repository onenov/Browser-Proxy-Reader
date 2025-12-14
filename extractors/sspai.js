// 少数派内容提取器

export async function extractSspaiContent(page) {
  return await page.evaluate(() => {
    const data = {
      title: "",
      author: "",
      content: "",
      html: "",
      tags: [],
    };

    // 提取标题
    const titleEl = document.querySelector("h1, .title, article h1");
    if (titleEl) {
      data.title = titleEl.textContent.trim();
    }

    // 提取作者 - 只取第一个作者信息
    const authorEl = document.querySelector(
      ".author .name, .author-name, [class*='author'] .name"
    );
    if (authorEl) {
      data.author = authorEl.textContent.trim();
    }

    // 提取正文内容 - 排除作者信息、分享按钮等
    const articleEl = document.querySelector("article, .article-content, main");
    if (articleEl) {
      // 克隆文章节点以便清理
      const clonedArticle = articleEl.cloneNode(true);

      // 移除不需要的元素
      const elementsToRemove = clonedArticle.querySelectorAll(
        ".author, .author-card, .share, .social-share, " +
          ".comments, .related, .subscribe, .ad, " +
          '[class*="author-card"], [class*="share"], ' +
          '[class*="comment"], [class*="related"], ' +
          "script, style, nav, header, footer"
      );
      elementsToRemove.forEach((el) => el.remove());

      data.html = clonedArticle.innerHTML;
      data.content = clonedArticle.innerText.trim();
    }

    // 提取标签
    const tagElements = document.querySelectorAll(
      'a[href*="/tag/"], .tag, [class*="tag"]'
    );
    data.tags = Array.from(tagElements)
      .map((tag) => tag.textContent.trim())
      .filter((tag) => tag.startsWith("#"))
      .slice(0, 10);

    return data;
  });
}

