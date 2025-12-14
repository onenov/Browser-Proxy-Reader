// 中关村在线（ZOL）内容提取器

export async function extractZolContent(page) {
  return await page.evaluate(() => {
    const data = {
      title: "",
      author: "",
      content: "",
      html: "",
      tags: [],
    };

    // 提取标题 - 从文章h1标签提取
    const titleEl = document.querySelector("h1");
    if (titleEl) {
      data.title = titleEl.textContent.trim();
    } else {
      // 从页面标题清理
      const pageTitle = document.title;
      data.title = pageTitle
        .replace(/_.*-中关村在线$/, "")
        .replace(/-中关村在线$/, "")
        .trim();
    }

    // 提取作者
    const authorEl = document.querySelector(".author strong, .author a");
    if (authorEl) {
      data.author = authorEl.textContent.trim();
    }

    // 提取文章正文
    // 方法1：找到h1后，遍历所有p标签，只保留正文段落
    const allParagraphs = document.querySelectorAll("p");
    const contentParts = [];
    const htmlParts = [];
    
    let foundTitle = false;
    const h1 = document.querySelector("h1");
    
    allParagraphs.forEach((p, idx) => {
      const text = p.innerText.trim();
      
      // 过滤规则：保留有实质内容的段落
      if (
        text &&
        text.length >= 30 && // 至少30个字符（包含30）
        !text.includes("本文属于原创文章") &&
        !text.includes("纠错与问题建议") &&
        !text.includes("下载ZOL") &&
        !text.includes("©") &&
        !text.includes("版权所有") &&
        !text.includes("公司简介") &&
        !text.includes("营销推广") &&
        !text.includes("报价") &&
        !text.includes("京东") &&
        !text.includes("精品图赏") &&
        !text.startsWith("http")
      ) {
        // 额外检查：这是正文段落吗？（索引0-4通常是正文）
        // 或者段落长度超过100字符（长段落通常是正文）
        if (idx < 6 || text.length > 100) {
          contentParts.push(text);
          htmlParts.push(p.outerHTML);
        }
      }
    });
    
    data.content = contentParts.join("\n\n");
    data.html = htmlParts.join("");

    // 提取标签
    const tagElements = document.querySelectorAll('.key_word a, a[href*="/tags/"]');
    data.tags = Array.from(tagElements)
      .map((tag) => {
        const text = tag.textContent.trim();
        return text.startsWith("#") ? text : `#${text}`;
      })
      .filter((tag) => tag.length > 1)
      .slice(0, 10);

    return data;
  });
  
  return result;
}

