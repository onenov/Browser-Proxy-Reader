// 什么值得买内容提取器

export async function extractSmzdmContent(page) {
  return await page.evaluate(() => {
    const data = {
      title: "",
      author: "",
      content: "",
      html: "",
      price: "",
    };

    // 提取标题
    const titleEl = document.querySelector("h1, .title");
    if (titleEl) {
      data.title = titleEl.textContent.trim();
    }

    // 提取作者
    const authorEl = document.querySelector(".zhiyou-name, .author-name");
    if (authorEl) {
      data.author = authorEl.textContent.trim();
    }

    // 提取价格信息
    const priceEl = document.querySelector(".price-info, .price");
    if (priceEl) {
      data.price = priceEl.textContent.trim();
    }

    // 什么值得买主要是优惠信息，提取关键描述即可
    const paragraphs = document.querySelectorAll("p");
    const contentParts = [];
    const debugSamples = [];
    
    paragraphs.forEach((p, idx) => {
      const text = p.innerText.trim();
      
      if (text) {
        debugSamples.push({
          index: idx,
          length: text.length,
          sample: text.substring(0, 80)
        });
      }
      
      // 保留有价值的内容，只过滤明显的UI和版权信息
      if (
        text &&
        text.length >= 10 &&
        // 只排除最明显的无关内容
        !text.includes("©") &&
        !text.includes("京公网") &&
        !text.includes("ICP") &&
        !text.includes("许可证") &&
        !text.includes("营业执照") &&
        !text.includes("举报") &&
        !text.includes("Hi，我是") &&
        !text.includes("扫一下") &&
        !text.includes("扫码分享")
      ) {
        contentParts.push(text);
      }
    });

    // 提取所有匹配的段落
    data.content = contentParts.join("\n\n");
    data.html = contentParts.map(p => `<p>${p}</p>`).join("\n");
    
    // 如果没有提取到内容，尝试备用方案
    if (!data.content) {
      data.content = data.title;
      data.html = `<h1>${data.title}</h1>`;
    }

    return data;
  });
}

