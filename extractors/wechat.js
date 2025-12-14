// 微信公众号内容提取器

export async function extractWechatContent(page) {
  return await page.evaluate(() => {
    const data = {
      title: "",
      author: "",
      publishTime: "",
      content: "",
      coverImage: "",
      html: "",
    };

    // 提取标题
    const titleEl = document.querySelector("#activity-name, .rich_media_title");
    if (titleEl) {
      data.title = titleEl.textContent.trim();
    }

    // 提取作者
    const authorEl = document.querySelector(
      "#js_name, .rich_media_meta_text, .account_nickname_inner"
    );
    if (authorEl) {
      data.author = authorEl.textContent.trim();
    }

    // 提取发布时间
    const timeEl = document.querySelector(
      "#publish_time, .rich_media_meta_text.rich_media_meta_time"
    );
    if (timeEl) {
      data.publishTime = timeEl.textContent.trim();
    }

    // 提取封面图
    const coverEl = document.querySelector(".rich_media_thumb, #js_cover");
    if (coverEl) {
      data.coverImage = coverEl.src || coverEl.getAttribute("data-src") || "";
    }

    // 提取正文内容
    const contentEl = document.querySelector(
      "#js_content, .rich_media_content"
    );
    if (contentEl) {
      // 克隆节点以便清理
      const clonedContent = contentEl.cloneNode(true);
      
      // 清理微信公众号复杂的样式和属性，保留基本结构
      const allElements = clonedContent.querySelectorAll("*");
      allElements.forEach((el) => {
        // 移除所有style属性（保留基本HTML结构）
        el.removeAttribute("style");
        // 移除微信特有的属性
        el.removeAttribute("data-src");
        el.removeAttribute("data-ratio");
        el.removeAttribute("data-w");
        el.removeAttribute("data-s");
        el.removeAttribute("data-type");
        el.removeAttribute("data-index");
        el.removeAttribute("data-original-style");
        // 移除class（简化结构）
        if (!["img", "a", "code", "pre"].includes(el.tagName.toLowerCase())) {
          el.removeAttribute("class");
        }
      });
      
      data.html = clonedContent.innerHTML;
      data.content = contentEl.innerText.trim();
    }

    return data;
  });
}

