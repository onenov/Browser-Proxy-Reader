// 知乎内容提取器

export async function extractZhihuContent(page) {
  return await page.evaluate(() => {
    const data = {
      title: "",
      author: "",
      content: "",
      html: "",
      tags: [],
      needsLogin: false,
    };

    // 检测是否需要登录
    if (
      document.title.includes("安全验证") ||
      document.title.includes("登录") ||
      document.body.innerText.includes("请您登录后查看") ||
      document.querySelector(".SignFlowModal")
    ) {
      data.needsLogin = true;
      data.title = document.title;
      return data;
    }

    // 提取标题
    const titleEl = document.querySelector(
      ".QuestionHeader-title, .Post-Title, .ContentItem-title, h1"
    );
    if (titleEl) {
      data.title = titleEl.textContent.trim();
    }

    // 提取作者
    const authorEl = document.querySelector(
      ".AuthorInfo-name, .UserLink-link, .author .name"
    );
    if (authorEl) {
      data.author = authorEl.textContent.trim();
    }

    // 提取内容 - 问题或文章的主要内容
    let contentEl = document.querySelector(
      ".RichContent-inner, .Post-RichText, .QuestionAnswer-content"
    );

    // 如果是问题页面，提取第一个回答
    if (!contentEl) {
      contentEl = document.querySelector(".List-item .RichContent-inner");
    }

    if (contentEl) {
      // 克隆节点以便清理
      const clonedContent = contentEl.cloneNode(true);

      // 移除不需要的元素
      const elementsToRemove = clonedContent.querySelectorAll(
        ".ContentItem-actions, .Sticky, .Card, " +
          '[data-za-detail-view-path-module*="Recommend"], ' +
          ".AdBanner, .Recommendations, " +
          "script, style"
      );
      elementsToRemove.forEach((el) => el.remove());

      data.html = clonedContent.innerHTML;
      data.content = clonedContent.innerText.trim();
    }

    // 提取话题标签
    const topicElements = document.querySelectorAll(
      ".QuestionHeader-topics .Tag, .Tag-content"
    );
    data.tags = Array.from(topicElements)
      .map((tag) => {
        const text = tag.textContent.trim();
        return text.startsWith("#") ? text : `#${text}`;
      })
      .filter((tag) => tag.length > 1)
      .slice(0, 10);

    return data;
  });
}

