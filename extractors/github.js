// GitHub 内容提取器

export async function extractGithubContent(page) {
  return await page.evaluate(() => {
    const data = {
      title: "",
      description: "",
      content: "",
      html: "",
      stars: "",
      forks: "",
      language: "",
      releases: [],
    };

    // 提取仓库标题
    const repoName = document.querySelector("[itemprop='name'] a");
    const authorName = document.querySelector(".author a");
    if (authorName && repoName) {
      data.title = `${authorName.textContent.trim()}/${repoName.textContent.trim()}`;
    }

    // 提取描述 - 从About部分提取
    let descEl = document.querySelector(".BorderGrid .f4.my-3, [itemprop='about']");
    if (descEl) {
      data.description = descEl.textContent.trim();
    } else {
      // 备用方案：从meta标签提取
      const metaDesc = document.querySelector("meta[property='og:description']");
      if (metaDesc) {
        data.description = metaDesc.getAttribute("content") || "";
      }
    }

    // 提取 stars
    const starsEl = document.querySelector("#repo-stars-counter-star, [href$='/stargazers']");
    if (starsEl) {
      data.stars = starsEl.textContent.trim();
    }

    // 提取 forks
    const forksEl = document.querySelector("#repo-network-counter, [href$='/forks']");
    if (forksEl) {
      data.forks = forksEl.textContent.trim();
    }

    // 提取主要语言
    const langEl = document.querySelector("[itemprop='programmingLanguage']");
    if (langEl) {
      data.language = langEl.textContent.trim();
    }

    // 提取最新 releases
    const releases = [];
    
    // 方法：查找所有包含release标签的链接
    const releaseLinks = document.querySelectorAll("a[href*='/releases/tag/']");
    
    if (releaseLinks.length > 0) {
      // 只取第一个（最新版本）
      const firstLink = releaseLinks[0];
      
      // 提取版本号 - 从URL中提取
      const urlParts = firstLink.href.split('/tag/');
      const version = urlParts.length > 1 ? urlParts[1] : firstLink.textContent.trim();
      
      // 查找日期
      const parent = firstLink.parentElement;
      const dateEl = parent ? parent.querySelector("relative-time") : null;
      let date = "";
      
      if (dateEl) {
        try {
          const datetime = dateEl.getAttribute("datetime");
          if (datetime) {
            date = new Date(datetime).toLocaleDateString("zh-CN");
          }
        } catch (e) {
          date = dateEl.textContent.trim();
        }
      }
      
      releases.push({
        version: version.replace(/\n.*$/s, "").trim(), // 移除换行后的内容
        url: firstLink.href,
        date
      });
    }
    
    data.releases = releases;

    // 提取 README 内容
    const readmeEl = document.querySelector("article.markdown-body, .markdown-body");
    
    if (readmeEl) {
      // 克隆节点
      const clonedReadme = readmeEl.cloneNode(true);

      // 移除不需要的元素
      const elementsToRemove = clonedReadme.querySelectorAll(
        // 导航和按钮
        ".octicon, " +
        // 其他
        "script, style"
      );
      elementsToRemove.forEach((el) => el.remove());

      data.html = clonedReadme.innerHTML;
      data.content = clonedReadme.innerText.trim();
    }

    return data;
  });
}

