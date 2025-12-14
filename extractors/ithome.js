// IT之家内容提取器

export async function extractIthomeContent(page) {
  return await page.evaluate(() => {
    const data = {
      title: "",
      author: "",
      content: "",
      html: "",
      tags: [],
    };

    // 提取标题
    const titleEl = document.querySelector("h1, .title");
    if (titleEl) {
      data.title = titleEl.textContent.trim();
    }

    // 提取作者
    const authorEl = document.querySelector(".author strong, .author a");
    if (authorEl) {
      data.author = authorEl.textContent.trim();
    }

    // 提取文章正文
    const articleEl = document.querySelector("#paragraph, .post_content, .article-content");
    
    if (articleEl) {
      // 克隆文章节点以便清理
      const clonedArticle = articleEl.cloneNode(true);

      // 移除不需要的元素
      const elementsToRemove = clonedArticle.querySelectorAll(
        // 广告相关
        ".m-ads, .ad, [class*='ad-'], [id*='ad-'], " +
        // 相关文章
        ".relate, [class*='relate'], [class*='recommend'], " +
        // 分享按钮
        ".share, [class*='share'], " +
        // 评论
        ".comment, #comment, " +
        // 底部声明和导航
        ".post-tag, .key_word, [class*='keyword'], " +
        // 其他UI元素
        "script, style, iframe"
      );
      elementsToRemove.forEach((el) => el.remove());

      data.html = clonedArticle.innerHTML;
      data.content = clonedArticle.innerText.trim();
    }

    // 提取标签 - 从关键词中提取
    const keywordLinks = document.querySelectorAll(".key_word a, a[href*='/tags/']");
    data.tags = Array.from(keywordLinks)
      .map((link) => {
        const text = link.textContent.trim();
        return text.startsWith("#") ? text : `#${text}`;
      })
      .filter((tag) => tag.length > 1)
      .slice(0, 10);

    return data;
  });
}

