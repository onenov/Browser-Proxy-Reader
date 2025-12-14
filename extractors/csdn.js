// CSDN 内容提取器

export async function extractCsdnContent(page) {
  return await page.evaluate(() => {
    const data = {
      title: "",
      author: "",
      content: "",
      html: "",
      tags: [],
    };

    // 提取标题 - 从文章正文区域提取，不是页面标题
    const titleEl = document.querySelector(
      "#articleContentId h1, .title-article, article h1"
    );
    if (titleEl) {
      data.title = titleEl.textContent.trim();
    } else {
      // 如果找不到文章标题，从页面标题提取并清理
      const pageTitle = document.title;
      data.title = pageTitle.replace(/-CSDN博客$/, "").replace(/_.*-CSDN博客$/, "").trim();
    }

    // 提取作者
    const authorEl = document.querySelector(
      ".follow-nickName, .user-info .name, a.follow-nickName"
    );
    if (authorEl) {
      data.author = authorEl.textContent.trim();
    }

    // 提取文章正文内容
    const articleEl = document.querySelector("#content_views, .article_content, #article_content");
    
    if (articleEl) {
      // 克隆文章节点以便清理
      const clonedArticle = articleEl.cloneNode(true);

      // 移除不需要的元素
      const elementsToRemove = clonedArticle.querySelectorAll(
        // 推荐文章
        ".recommend-box, .recommend-item-box, .recommend-list, " +
        // 广告和营销
        ".csdn-side-toolbar, .tool-box, .opt-box, " +
        // 评论区
        "#comment, .comment, [class*='comment'], " +
        // 侧边栏推荐
        ".aside-box, [class*='recommend'], " +
        // 底部链接和版权
        "footer, .footer, [class*='footer'], " +
        // 点赞收藏等按钮
        ".tool-bar, .tool-active, [class*='toolbar'], " +
        // 标签栏（单独提取）
        ".tags-box, " +
        // 其他UI元素
        "script, style, iframe, .hide"
      );
      elementsToRemove.forEach((el) => el.remove());

      data.html = clonedArticle.innerHTML;
      data.content = clonedArticle.innerText.trim();
    }

    // 提取标签
    const tagElements = document.querySelectorAll(".tags-box a, a.tag-link");
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

