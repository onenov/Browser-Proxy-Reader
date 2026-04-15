// 飞书文档内容提取器

export async function extractFeishuContent(page) {
  await page.evaluate(() => {
    window.__feishuCollectedBlocks = new Map();
  });

  const collectVisibleBlocks = async () => {
    return await page.evaluate(() => {
      const cleanText = (value) =>
        (value || "")
          .replace(/\u200b/g, "")
          .replace(/\u00a0/g, " ")
          .replace(/[ \t]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

      const getVisibleText = (element) => {
        if (!element) return "";
        return cleanText(element.textContent || element.innerText || "");
      };

      const getImageSrc = (img, block) => {
        if (!img && !block) return "";

        const candidateSources = [
          img?.getAttribute("data-src"),
          img?.getAttribute("src"),
          img?.currentSrc,
          img?.src,
        ].filter(Boolean);

        const preferredSource = candidateSources.find(
          (src) => !src.startsWith("data:image/") && !src.startsWith("blob:")
        );
        if (preferredSource) {
          return preferredSource;
        }

        const imageBlock = block?.querySelector(".image-block[image-token]");
        const imageToken = imageBlock?.getAttribute("image-token") || "";
        const mountNodeToken =
          block?.getAttribute("data-record-id") ||
          block?.getAttribute("data-block-id") ||
          "";

        if (!imageToken || !mountNodeToken) {
          return candidateSources[0] || "";
        }

        const url = new URL(
          `https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/v2/cover/${imageToken}/`
        );
        url.searchParams.set("fallback_source", "1");
        url.searchParams.set("height", "1280");
        url.searchParams.set("mount_node_token", mountNodeToken);
        url.searchParams.set("mount_point", "docx_image");
        url.searchParams.set("policy", "equal");
        url.searchParams.set("width", "1280");

        return url.toString();
      };

      const serializeBlock = (block) => {
        if (!block || block.classList.contains("isEmpty")) return null;

        const recordId = block.getAttribute("data-record-id");
        if (!recordId) return null;

        if (block.classList.contains("docx-text-block")) {
          const text = getVisibleText(block.querySelector(".ace-line"));
          if (!text) return null;
          return { recordId, type: "paragraph", text, html: `<p>${text}</p>` };
        }

        if (block.classList.contains("docx-heading1-block")) {
          const text = getVisibleText(block.querySelector(".ace-line"));
          if (!text) return null;
          return { recordId, type: "heading1", text, html: `<h1>${text}</h1>` };
        }

        if (block.classList.contains("docx-heading2-block")) {
          const text = getVisibleText(block.querySelector(".ace-line"));
          if (!text) return null;
          return { recordId, type: "heading2", text, html: `<h2>${text}</h2>` };
        }

        if (block.classList.contains("docx-heading3-block")) {
          const text = getVisibleText(block.querySelector(".ace-line"));
          if (!text) return null;
          return { recordId, type: "heading3", text, html: `<h3>${text}</h3>` };
        }

        if (block.classList.contains("docx-image-block")) {
          const img = block.querySelector("img");
          const src = getImageSrc(img, block);
          if (!src) return null;

          const alt = cleanText(img?.getAttribute("alt") || "飞书文档 - 图片");
          return {
            recordId,
            type: "image",
            text: `[图片] ${src}`,
            html: `<p><img src="${src}" alt="${alt}"></p>`,
            image: src,
          };
        }

        return null;
      };

      const blocks = Array.from(document.querySelectorAll(".page-block-children .block[data-record-id]"));
      const collected = [];

      for (const block of blocks) {
        const serialized = serializeBlock(block);
        if (!serialized) continue;

        if (!window.__feishuCollectedBlocks.has(serialized.recordId)) {
          window.__feishuCollectedBlocks.set(serialized.recordId, serialized);
          collected.push(serialized.recordId);
        }
      }

      return {
        collectedCount: window.__feishuCollectedBlocks.size,
        collected,
      };
    });
  };

  const getScrollState = async () => {
    return await page.evaluate(() => {
      const candidates = [
        document.querySelector(".page-main"),
        document.querySelector(".bear-web-x-container"),
        document.querySelector(".suite-body"),
        document.scrollingElement,
        document.documentElement,
        document.body,
      ].filter(Boolean);

      const scrollTarget = candidates.find(
        (element) => element.scrollHeight > element.clientHeight + 10
      ) || document.scrollingElement || document.documentElement || document.body;

      return {
        top: scrollTarget.scrollTop,
        height: scrollTarget.scrollHeight,
        clientHeight: scrollTarget.clientHeight,
      };
    });
  };

  const scrollTo = async (top) => {
    await page.evaluate((targetTop) => {
      const candidates = [
        document.querySelector(".page-main"),
        document.querySelector(".bear-web-x-container"),
        document.querySelector(".suite-body"),
        document.scrollingElement,
        document.documentElement,
        document.body,
      ].filter(Boolean);

      const scrollTarget = candidates.find(
        (element) => element.scrollHeight > element.clientHeight + 10
      ) || document.scrollingElement || document.documentElement || document.body;

      scrollTarget.scrollTop = targetTop;
    }, top);
  };

  await scrollTo(0);
  await new Promise((resolve) => setTimeout(resolve, 500));
  await collectVisibleBlocks();

  let lastTop = -1;
  let stableRounds = 0;

  for (let i = 0; i < 120 && stableRounds < 4; i += 1) {
    const state = await getScrollState();
    const nextTop = Math.min(
      state.top + Math.max(600, Math.floor(state.clientHeight * 0.8)),
      state.height
    );

    await scrollTo(nextTop);
    await new Promise((resolve) => setTimeout(resolve, 350));
    await collectVisibleBlocks();

    const nextState = await getScrollState();
    const reachedBottom = nextState.top + nextState.clientHeight >= nextState.height - 5;

    if (nextState.top === lastTop || reachedBottom) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
      lastTop = nextState.top;
    }
  }

  return await page.evaluate(() => {
    const data = {
      title: "",
      author: "",
      publishTime: "",
      content: "",
      coverImage: "",
      html: "",
    };

    const cleanText = (value) =>
      (value || "")
        .replace(/\u200b/g, "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    const getVisibleText = (element) => {
      if (!element) return "";
      return cleanText(element.textContent || element.innerText || "");
    };

    const titleSelectors = [
      ".note-title__input-text",
      ".page-block-header + h1 .ace-line",
      ".page-block-content .ace-line",
    ];

    for (const selector of titleSelectors) {
      const titleEl = document.querySelector(selector);
      const title = getVisibleText(titleEl);
      if (title) {
        data.title = title;
        break;
      }
    }

    if (!data.title) {
      try {
        const pageRecord = window.catalogRecordInfo?.headingRecords
          ? Object.values(window.catalogRecordInfo.headingRecords).find(
              (record) => record?.data?.type === "page"
            )
          : null;
        data.title =
          pageRecord?.data?.text?.initialAttributedTexts?.text?.[0]?.trim() || "";
      } catch (error) {
        // ignore
      }
    }

    const timeEl = document.querySelector(
      ".doc-info-time-item, .note-meta__desc-time"
    );
    if (timeEl) {
      data.publishTime = getVisibleText(timeEl);
    }

    const headingRecords = window.catalogRecordInfo?.headingRecords
      ? Object.values(window.catalogRecordInfo.headingRecords)
      : [];
    const pageRecord = headingRecords.find((record) => record?.data?.type === "page");
    const orderedRecordIds = Array.isArray(pageRecord?.data?.children)
      ? pageRecord.data.children
      : [];
    const collectedBlocks = window.__feishuCollectedBlocks || new Map();
    const htmlParts = [];
    const textParts = [];

    for (const recordId of orderedRecordIds) {
      const block = collectedBlocks.get(recordId);
      if (!block) continue;

      htmlParts.push(block.html);
      textParts.push(block.text);

      if (!data.coverImage && block.image) {
        data.coverImage = block.image;
      }
    }

    if (htmlParts.length === 0) {
      for (const block of collectedBlocks.values()) {
        htmlParts.push(block.html);
        textParts.push(block.text);

        if (!data.coverImage && block.image) {
          data.coverImage = block.image;
        }
      }
    }

    data.html = htmlParts.join("\n");
    data.content = cleanText(textParts.join("\n\n"));

    if (!data.author) {
      const metaAuthor = document.querySelector('meta[name="author"]');
      if (metaAuthor) {
        data.author = cleanText(metaAuthor.getAttribute("content") || "");
      }
    }

    return data;
  });
}
