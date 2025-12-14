// 网站类型检测工具

export function isWechatArticle(url) {
  return url.includes("mp.weixin.qq.com");
}

export function isXiaohongshu(url) {
  return url.includes("xiaohongshu.com") || url.includes("xhslink.com");
}

export function isSspai(url) {
  return url.includes("sspai.com");
}

export function isBilibiliArticle(url) {
  return url.includes("bilibili.com/read");
}

export function isZhihuArticle(url) {
  return url.includes("zhihu.com");
}

export function isCsdn(url) {
  return url.includes("blog.csdn.net");
}

export function isIthome(url) {
  return url.includes("ithome.com");
}

export function isZol(url) {
  return url.includes("zol.com.cn");
}

export function isJuejin(url) {
  return url.includes("juejin.cn");
}

export function isSmzdm(url) {
  return url.includes("smzdm.com");
}

export function isGithub(url) {
  return url.includes("github.com") && !url.includes("gist.github.com");
}

// 获取网站类型
export function getSiteType(url) {
  if (isWechatArticle(url)) return "wechat";
  if (isXiaohongshu(url)) return "xiaohongshu";
  if (isSspai(url)) return "sspai";
  if (isCsdn(url)) return "csdn";
  if (isIthome(url)) return "ithome";
  if (isZol(url)) return "zol";
  if (isJuejin(url)) return "juejin";
  if (isSmzdm(url)) return "smzdm";
  if (isGithub(url)) return "github";
  if (isBilibiliArticle(url)) return "bilibili";
  if (isZhihuArticle(url)) return "zhihu";
  return "general";
}

