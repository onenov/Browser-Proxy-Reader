// 掘金内容提取器

export async function extractJuejinContent(page) {
  return await page.evaluate(() => {
    const data = {
      title: "",
      author: "",
      content: "",
      html: "",
      tags: [],
    };

    // 提取标题
    const titleEl = document.querySelector("h1, .article-title");
    if (titleEl) {
      data.title = titleEl.textContent.trim();
    }

    // 提取作者
    const authorEl = document.querySelector(".username, .author-name a");
    if (authorEl) {
      data.author = authorEl.textContent.trim();
    }

    // 提取文章正文 - 掘金的正文在 article 标签或特定类中
    const articleEl = document.querySelector("article .markdown-body, .article-content");
    
    if (articleEl) {
      // 克隆节点以便清理
      const clonedArticle = articleEl.cloneNode(true);

      // 移除不需要的元素
      const elementsToRemove = clonedArticle.querySelectorAll(
        // 评论区
        ".comment, [class*='comment'], " +
        // 推荐文章
        ".recommend, [class*='recommend'], .related, " +
        // 广告
        ".ad, [class*='ad-'], " +
        // 其他UI元素
        "script, style, iframe"
      );
      elementsToRemove.forEach((el) => el.remove());

      data.html = clonedArticle.innerHTML;
      data.content = clonedArticle.innerText.trim();
    }

    // 提取标签
    const tagElements = document.querySelectorAll("a[href*='/tag/']");
    data.tags = Array.from(tagElements)
      .map((tag) => {
        const text = tag.textContent.trim();
        return text.startsWith("#") ? text : `#${text}`;
      })
      .filter((tag) => tag.length > 1)
      .slice(0, 10);

    return data;
  });
}

