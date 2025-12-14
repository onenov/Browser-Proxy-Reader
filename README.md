# Browser Proxy Reader

> 基于 Node.js 和 Puppeteer 的智能浏览器代理服务，用于获取和返回结构化内容。

支持 **11 个主流网站** 的专用内容提取，包括微信公众号、小红书、GitHub、掘金、CSDN 等平台，提供纯净、结构化的内容输出。

[![Node.js](https://img.shields.io/badge/Node.js-v22+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ 核心特性

- 🚀 **真实浏览器渲染** - 使用 Puppeteer 驱动 Chrome，完美支持 JavaScript 动态内容
- 📱 **11 个专用提取器** - 每个网站独立优化，精准提取有价值内容
- 🧹 **智能内容过滤** - 自动过滤广告、推荐文章、评论区等无关内容
- 🔐 **Cookie 登录支持** - 可访问需要登录的网站（小红书、知乎等）
- 📝 **多格式输出** - 支持 JSON、Markdown、纯文本、HTML 四种格式
- 🎯 **模块化架构** - 清晰的代码结构，易于维护和扩展
- ⚡ **性能优化** - 浏览器实例复用，提高响应速度
- 🛡️ **反爬虫优化** - 隐藏自动化特征，模拟真实用户行为

---

## 🌐 支持的网站

| 网站       | 状态 | 登录要求 | 提取内容                       |
| ---------- | ---- | -------- | ------------------------------ |
| 微信公众号 | ✅   | 无需登录 | 标题、作者、时间、正文、封面图 |
| GitHub     | ✅   | 无需登录 | README、Stars、Forks、Releases |
| 掘金       | ✅   | 无需登录 | 标题、作者、正文、标签         |
| 少数派     | ✅   | 无需登录 | 纯净正文、标签                 |
| CSDN       | ✅   | 无需登录 | 过滤推荐和广告的纯净正文       |
| IT 之家    | ✅   | 无需登录 | 新闻正文、标签                 |
| 中关村在线 | ✅   | 无需登录 | 纯净正文                       |
| 什么值得买 | ✅   | 无需登录 | 商品描述、价格、活动信息       |
| 小红书     | ✅   | 需要登录 | 标题、作者、内容、标签         |
| 知乎       | ✅   | 需要登录 | 问题、回答、文章               |
| 通用网站   | ✅   | 无需登录 | 智能识别主要内容区域           |

---

## 🛠️ 快速开始

### 安装依赖

```bash
# 安装项目依赖
pnpm install

# 安装 Chrome 浏览器（首次使用必需）
pnpm exec puppeteer browsers install chrome
```

### 启动服务

```bash
# 开发模式（支持热重载）
pnpm dev

# 生产模式
pnpm start
```

服务器默认运行在 `http://localhost:3000`

### 快速测试

```bash
# 健康检查
curl http://localhost:3000/health

# 查看 API 文档
curl http://localhost:3000/

# 测试微信公众号
curl "http://localhost:3000/api/parse?url=https://mp.weixin.qq.com/s/xxxxx&format=markdown"

# 测试 GitHub 仓库（含 Releases）
curl "http://localhost:3000/api/parse?url=https://github.com/langgenius/dify&format=json"

# 测试掘金文章
curl "http://localhost:3000/api/parse?url=https://juejin.cn/post/xxxxx"
```

---

## 📖 API 文档

### GET 接口

适用于无需登录的网站

```
GET /api/parse?url=<网址>&format=<格式>
```

**参数：**

- `url`（必需）：要抓取的网址
- `format`（可选）：返回格式，可选 `json`（默认）| `markdown` | `text` | `html`

**示例：**

```bash
# 获取 JSON 格式（包含所有字段）
curl "http://localhost:3000/api/parse?url=https://github.com/langgenius/dify"

# 获取 Markdown 格式
curl "http://localhost:3000/api/parse?url=https://github.com/langgenius/dify&format=markdown"
```

### POST 接口

适用于需要登录的网站（小红书、知乎等）

```
POST /api/parse
Content-Type: application/json
```

**请求体：**

```json
{
  "url": "https://www.xiaohongshu.com/explore/xxxxx",
  "format": "markdown",
  "cookies": [
    {
      "name": "cookie_name",
      "value": "cookie_value",
      "domain": ".xiaohongshu.com"
    }
  ]
}
```

**如何获取 Cookies？** → 查看 [COOKIES.md](./COOKIES.md)

### 简化接口

```
GET /r/<网址>?format=<格式>
```

**示例：**

```bash
# Markdown 格式（默认）
curl "http://localhost:3000/r/https://mp.weixin.qq.com/s/xxxxx"

# JSON 格式
curl "http://localhost:3000/r/https://github.com/langgenius/dify?format=json"
```

---

## 📦 返回数据示例

### 微信公众号

```json
{
  "url": "https://mp.weixin.qq.com/s/xxxxx",
  "success": true,
  "title": "文章标题",
  "author": "公众号名称",
  "publishTime": "2024-01-01",
  "content": "纯文本内容...",
  "coverImage": "https://封面图URL",
  "html": "<div>原始HTML...</div>",
  "markdown": "# 文章标题\n\nMarkdown内容..."
}
```

### GitHub 仓库

```json
{
  "url": "https://github.com/langgenius/dify",
  "success": true,
  "title": "langgenius/dify",
  "description": "Production-ready platform for agentic workflow development.",
  "stars": "122k",
  "forks": "18.9k",
  "language": "TypeScript",
  "releases": [
    {
      "version": "1.11.1",
      "url": "https://github.com/langgenius/dify/releases/tag/1.11.1",
      "date": "2025/12/12"
    }
  ],
  "content": "完整的README文本内容...",
  "markdown": "完整的README Markdown内容..."
}
```

### 小红书笔记

```json
{
  "url": "https://www.xiaohongshu.com/explore/xxxxx",
  "success": true,
  "title": "笔记标题",
  "author": "作者昵称",
  "content": "纯文本内容...",
  "markdown": "Markdown内容...",
  "tags": ["#标签1", "#标签2", "#标签3"]
}
```

> **注意：** 小红书由于严格的反爬虫机制，目前只支持提取文本内容（标题、作者、正文、标签）。

---

## 📂 项目结构

```
/Get/
├── extractors/           # 内容提取器（11个专用）
│   ├── wechat.js        # 微信公众号
│   ├── xiaohongshu.js   # 小红书（需Cookie）
│   ├── juejin.js        # 掘金
│   ├── sspai.js         # 少数派
│   ├── csdn.js          # CSDN博客
│   ├── ithome.js        # IT之家
│   ├── zol.js           # 中关村在线
│   ├── smzdm.js         # 什么值得买
│   ├── github.js        # GitHub（含Releases）
│   ├── zhihu.js         # 知乎（需Cookie）
│   └── general.js       # 通用网页
├── utils/               # 工具模块
│   ├── browser.js       # 浏览器管理+反爬虫
│   └── site-detector.js # 网站类型检测
├── server.js            # 主服务器
├── package.json         # 依赖配置
├── README.md            # 本文档
└── COOKIES.md           # Cookie使用指南
```

---

## 🎯 使用场景

### 内容聚合

抓取多个来源的文章，汇总成统一格式的内容库。

```bash
# 抓取技术文章
curl "http://localhost:3000/api/parse?url=https://juejin.cn/post/xxxxx&format=markdown"

# 抓取新闻
curl "http://localhost:3000/api/parse?url=https://www.ithome.com/0/xxx/xxx.htm"
```

### 项目监控

监控 GitHub 仓库的更新和 Release 版本。

```bash
# 获取仓库信息和最新Release
curl "http://localhost:3000/api/parse?url=https://github.com/langgenius/dify"
```

### 数据分析

提取纯净的文本内容用于 NLP 分析或 AI 训练。

```bash
# 获取纯文本格式
curl "http://localhost:3000/api/parse?url=https://sspai.com/post/xxxxx&format=text"
```

---

## ⚙️ 配置

### 环境变量

创建 `.env` 文件：

```bash
# 服务器端口（默认 3000）
PORT=3000

# 可选：指定 Chrome 可执行文件路径
# PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
```

### Cookie 配置

对于需要登录的网站（小红书、知乎），请参考 [COOKIES.md](./COOKIES.md) 文档了解：

- 如何获取 Cookies
- 如何使用 POST 接口传入 Cookies
- 安全注意事项

---

## 🔧 技术栈

- **[Node.js](https://nodejs.org/)** - JavaScript 运行环境
- **[Express](https://expressjs.com/)** - Web 框架
- **[Puppeteer](https://pptr.dev/)** - 无头浏览器控制
- **[Turndown](https://github.com/mixmark-io/turndown)** - HTML 转 Markdown
- **[Cheerio](https://cheerio.js.org/)** - HTML 解析

---

## 📈 项目亮点

### 智能内容提取

每个网站都有专门优化的提取器，确保内容纯净：

| 网站       | 优化内容                        |
| ---------- | ------------------------------- |
| CSDN       | 移除推荐文章、广告、评论区      |
| IT 之家    | 移除相关文章、商家推广          |
| ZOL        | 深度清理导航和推荐              |
| 少数派     | 移除重复作者信息                |
| 什么值得买 | 提取商品信息，过滤冗长活动规则  |
| 掘金       | 移除评论和推荐文章              |
| GitHub     | 提取 README、仓库信息、Releases |

### 易于扩展

模块化设计，添加新网站支持只需 3 步：

1. 在 `extractors/` 目录创建新的提取器文件
2. 在 `utils/site-detector.js` 添加网站检测规则
3. 在 `server.js` 的 switch 语句中添加 case 分支

---

## 📝 注意事项

1. **首次使用**：Puppeteer 会下载 Chrome 浏览器（约 150MB）
2. **安装浏览器**：执行 `pnpm exec puppeteer browsers install chrome`
3. **加载时间**：某些网站需要 2-5 秒加载时间（如微信公众号、小红书）
4. **请求频率**：建议设置合理的请求间隔，避免被目标网站封禁
5. **自动重启**：使用 `--watch` 模式时，文件修改后服务器会自动重启

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

如需添加新网站支持，请参考现有的提取器实现。

---

## 📄 许可证

[MIT](LICENSE)

---

## 🔗 相关链接

- **文档**：[COOKIES.md](./COOKIES.md) - Cookie 使用指南
- **技术栈**：[Puppeteer](https://pptr.dev/) | [Express](https://expressjs.com/)
- **Node.js**: 需要 v22 或更高版本
