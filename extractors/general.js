// 通用网页内容提取器

export async function extractGeneralContent(page, url) {
  return await page.evaluate(() => {
    // 移除脚本、样式等不需要的标签
    const elementsToRemove = document.querySelectorAll(
      "script, style, nav, header, footer, iframe, noscript"
    );
    elementsToRemove.forEach((el) => el.remove());

    const data = {
      title: "",
      description: "",
      content: "",
      html: "",
    };

    // 提取标题
    data.title = document.title || "";

    // 提取描述
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      data.description = metaDesc.getAttribute("content") || "";
    }

    // 尝试找到主要内容区域
    const mainContent = document.querySelector(
      'article, main, .content, .article, #content, .post-content, .entry-content, [role="main"]'
    );

    if (mainContent) {
      data.html = mainContent.innerHTML;
      data.content = mainContent.innerText.trim();
    } else {
      // 如果找不到主要内容区域，使用body
      data.html = document.body.innerHTML;
      data.content = document.body.innerText.trim();
    }

    return data;
  });
}

