# Browser Proxy Reader

> 基于 Node.js 和 Puppeteer 的智能浏览器代理服务，用于获取和返回结构化内容。

支持 **12 个主流网站** 的专用内容提取，包括微信公众号、飞书、小红书、GitHub、掘金、CSDN 等平台，提供纯净、结构化的内容输出，并支持可选的 AI Markdown 标准化。

[![Node.js](https://img.shields.io/badge/Node.js-v22+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ 核心特性

- 🚀 **真实浏览器渲染** - 使用 Puppeteer 驱动 Chrome，支持 JavaScript 动态内容
- 📱 **12 个专用提取器** - 每个网站独立优化，精准提取有价值内容
- 🧹 **智能内容过滤** - 自动过滤广告、推荐文章、评论区等无关内容
- 🔐 **Cookie 登录支持** - 可访问需要登录的网站（小红书、知乎等）
- 📝 **多格式输出** - 支持 JSON、Markdown、纯文本、HTML 四种格式
- 🤖 **AI Markdown 标准化** - 可选对抓取后的 Markdown 再整理一次，输出更标准的 md
- 🖼️ **图片转存替换** - 支持飞书、微信公众号图片下载后重新上传，输出外部可访问的图链
- ⚡ **性能优化** - 浏览器实例复用，提高响应速度
- 🛡️ **反爬虫优化** - 隐藏自动化特征，模拟真实用户行为
- 🧰 **PM2 部署支持** - 提供 `.env` 自动加载、PM2 启停脚本与多实例配置

---

## 🌐 支持的网站

| 网站       | 状态 | 登录要求   | 提取内容                         |
| ---------- | ---- | ---------- | -------------------------------- |
| 微信公众号 | ✅   | 无需登录   | 标题、作者、时间、正文、封面图   |
| 飞书文档   | ✅   | 视权限而定 | 标题、作者、正文、图片、Markdown |
| GitHub     | ✅   | 无需登录   | README、Stars、Forks、Releases   |
| 掘金       | ✅   | 无需登录   | 标题、作者、正文、标签           |
| 少数派     | ✅   | 无需登录   | 纯净正文、标签                   |
| CSDN       | ✅   | 无需登录   | 过滤推荐和广告的纯净正文         |
| IT 之家    | ✅   | 无需登录   | 新闻正文、标签                   |
| 中关村在线 | ✅   | 无需登录   | 纯净正文                         |
| 什么值得买 | ✅   | 无需登录   | 商品描述、价格、活动信息         |
| 小红书     | ✅   | 需要登录   | 标题、作者、内容、标签           |
| 知乎       | ✅   | 需要登录   | 问题、回答、文章                 |
| 通用网站   | ✅   | 无需登录   | 智能识别主要内容区域             |

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

# 测试飞书文档
curl "http://localhost:3000/api/parse?url=https://your.feishu.cn/wiki/xxxxx&format=markdown"

# 测试 GitHub 仓库（含 Releases）
curl "http://localhost:3000/api/parse?url=https://github.com/langgenius/dify&format=json"

# 测试 AI Markdown 标准化
curl "http://localhost:3000/api/parse?url=https://mp.weixin.qq.com/s/xxxxx&format=markdown&ai=true"
```

---

## 📖 API 文档

### GET 接口

适用于无需登录的网站

```text
GET /api/parse?url=<网址>&format=<格式>&ai=<true|false>
```

**参数：**

- `url`（必需）：要抓取的网址
- `format`（可选）：返回格式，可选 `json`（默认）| `markdown` | `text` | `html`
- `ai`（可选）：是否对 Markdown 结果再执行一次 AI 标准化，默认 `false`

**示例：**

```bash
# 获取 JSON 格式（包含所有字段）
curl "http://localhost:3000/api/parse?url=https://github.com/langgenius/dify"

# 获取 Markdown 格式
curl "http://localhost:3000/api/parse?url=https://github.com/langgenius/dify&format=markdown"

# 获取 AI 整理后的 Markdown
curl "http://localhost:3000/api/parse?url=https://mp.weixin.qq.com/s/xxxxx&format=markdown&ai=true"
```

### POST 接口

适用于需要登录的网站（小红书、知乎等）

```text
POST /api/parse
Content-Type: application/json
```

**请求体：**

```json
{
  "url": "https://www.xiaohongshu.com/explore/xxxxx",
  "format": "markdown",
  "ai": true,
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

```text
GET /r/<网址>?format=<格式>&ai=<true|false>
```

**示例：**

```bash
# Markdown 格式（默认）
curl "http://localhost:3000/r/https://mp.weixin.qq.com/s/xxxxx"

# JSON 格式
curl "http://localhost:3000/r/https://github.com/langgenius/dify?format=json"

# AI 整理后的 Markdown
curl "http://localhost:3000/r/https://mp.weixin.qq.com/s/xxxxx?format=markdown&ai=true"
```

---

## 🤖 AI Markdown 标准化

当传入 `ai=true` 时，服务会在常规抓取完成后，再调用火山方舟模型对 Markdown 内容做一次整理。

当前实现特点：

- 使用 `chat/completions` 接口
- 默认模型：`doubao-seed-2-0-mini-260215`
- 默认 `reasoning_effort=minimal`
- 同时把 `Markdown` 和 `HTML` 传给模型
- `HTML` 仅作为结构参考
- 图片链接优先保留 Markdown 中已经替换过的 URL，避免被 HTML 中旧图链覆盖

适用场景：

- 抓取后的 Markdown 层级不稳定
- 列表、引用、标题结构需要统一
- 需要去掉少量抓取噪音，但不希望改写正文事实

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

### 飞书文档

```json
{
  "url": "https://your.feishu.cn/wiki/xxxxx",
  "success": true,
  "title": "飞书文档标题",
  "author": "作者名称",
  "content": "提取后的正文文本...",
  "coverImage": "https://cdn.example.com/feishu/cover.png",
  "html": "<h1>标题</h1><p>正文...</p>",
  "markdown": "# 标题\n\n正文...\n\n![image](https://cdn.example.com/feishu/image.png)"
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

## 🚀 PM2 部署

项目已提供 `ecosystem.config.cjs`，支持：

- 自动加载项目根目录 `.env`
- `production` 环境启动
- PM2 多实例配置
- 通过 `PM2_INSTANCES` 控制实例数

### Ubuntu 安装 Chrome / Chromium

如果你部署在 Ubuntu 服务器，建议先安装浏览器，再把浏览器路径写入 `.env` 的 `PUPPETEER_EXECUTABLE_PATH`。

#### 方案一：安装 Chromium（更常见）

```bash
sudo apt update
sudo apt install -y chromium-browser
which chromium-browser
```

常见路径：

```bash
/snap/chromium/current/usr/lib/chromium-browser/chrome
```

如果你的系统不是 snap 版本，也可能是：

```bash
/usr/bin/chromium-browser
```

对应 `.env` 配置示例：

```bash
PUPPETEER_EXECUTABLE_PATH=/snap/chromium/current/usr/lib/chromium-browser/chrome
```

#### 方案二：安装 Google Chrome

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb
which google-chrome
```

常见路径：

```bash
/usr/bin/google-chrome
```

对应 `.env` 配置示例：

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

#### 验证浏览器是否可用

```bash
$PUPPETEER_EXECUTABLE_PATH --version
```

如果你还没有写入环境变量，也可以直接测试：

```bash
/usr/bin/google-chrome --version
# 或
/snap/chromium/current/usr/lib/chromium-browser/chrome --version
```

### 常用命令

```bash
pnpm pm2:start
pnpm pm2:restart
pnpm pm2:stop
pnpm pm2:delete
pnpm pm2:logs
```

### 直接使用 PM2

```bash
pm2 start ecosystem.config.cjs --env production
pm2 restart Browser-Reader --update-env
pm2 logs Browser-Reader
```

### 多实例配置

在 `.env` 中增加：

```bash
PM2_INSTANCES=4
```

说明：

- 不配置时默认使用 `max`
- Puppeteer 服务比较吃资源，建议按机器配置逐步增加实例数
- 常见建议：2 核机器先从 `2` 开始，4 核机器先从 `2` 或 `4` 开始

---

## 📂 项目结构

```text
/Get/
├── extractors/             # 内容提取器
│   ├── wechat.js          # 微信公众号
│   ├── feishu.js          # 飞书文档
│   ├── xiaohongshu.js     # 小红书（需Cookie）
│   ├── juejin.js          # 掘金
│   ├── sspai.js           # 少数派
│   ├── csdn.js            # CSDN博客
│   ├── ithome.js          # IT之家
│   ├── zol.js             # 中关村在线
│   ├── smzdm.js           # 什么值得买
│   ├── github.js          # GitHub（含Releases）
│   ├── zhihu.js           # 知乎（需Cookie）
│   └── general.js         # 通用网页
├── utils/                 # 工具模块
│   ├── browser.js         # 浏览器管理 + 反爬虫
│   └── site-detector.js   # 网站类型检测
├── server.js              # 主服务器
├── ecosystem.config.cjs   # PM2 配置
├── package.json           # 依赖配置与脚本
├── .envexample            # 环境变量示例
├── README.md              # 本文档
└── COOKIES.md             # Cookie 使用指南
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

### 数据分析 / AI 预处理

提取纯净的文本内容或标准化 Markdown，用于 NLP 分析、知识库、二次 AI 处理。

```bash
# 获取纯文本格式
curl "http://localhost:3000/api/parse?url=https://sspai.com/post/xxxxx&format=text"

# 获取 AI 标准化后的 Markdown
curl "http://localhost:3000/api/parse?url=https://mp.weixin.qq.com/s/xxxxx&format=markdown&ai=true"
```

---

## ⚙️ 配置

### 环境变量

创建 `.env` 文件：

```bash
# 服务器端口（默认 3000）
PORT=3000

# 可选：指定 Chrome 可执行文件路径
PUPPETEER_EXECUTABLE_PATH=/snap/chromium/current/usr/lib/chromium-browser/chrome

# AI 接口配置
ARK_API_URL=https://ark.cn-beijing.volces.com/api/v3/chat/completions
ARK_MODEL=doubao-seed-2-0-mini-260215
ARK_API_KEY=your_api_key
ARK_REASONING_EFFORT=minimal

# PM2 多实例数量，可选
PM2_INSTANCES=4
```

### `.envexample`

项目提供 `.envexample` 作为参考模板，你可以复制后修改：

```bash
cp .envexample .env
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
- **[dotenv](https://github.com/motdotla/dotenv)** - 环境变量加载
- **PM2** - 生产部署与进程管理

---

## 📈 项目亮点

### 智能内容提取

每个网站都有专门优化的提取器，确保内容纯净：

| 网站       | 优化内容                          |
| ---------- | --------------------------------- |
| 微信公众号 | 支持正文提取与图片转存替换        |
| 飞书文档   | 支持虚拟列表滚动收集与图片转存    |
| CSDN       | 移除推荐文章、广告、评论区        |
| IT 之家    | 移除相关文章、商家推广            |
| ZOL        | 深度清理导航和推荐                |
| 少数派     | 移除重复作者信息                  |
| 什么值得买 | 提取商品信息，过滤冗长活动规则    |
| 掘金       | 移除评论和推荐文章                |
| GitHub     | 提取 README、仓库信息、Releases   |

### 易于扩展

模块化设计，添加新网站支持只需 3 步：

1. 在 `extractors/` 目录创建新的提取器文件
2. 在 `utils/site-detector.js` 添加网站检测规则
3. 在 `server.js` 的 switch 语句中添加 case 分支

---

## 📝 注意事项

1. **首次使用**：Puppeteer 会下载 Chrome 浏览器（约 150MB）
2. **安装浏览器**：执行 `pnpm exec puppeteer browsers install chrome`
3. **加载时间**：某些网站需要 2-5 秒甚至更久加载时间，服务器环境可能更慢
4. **请求频率**：建议设置合理的请求间隔，避免被目标网站封禁
5. **PM2 多实例**：实例越多，占用的浏览器资源越高，请按机器配置逐步调整
6. **AI 标准化**：启用 `ai=true` 会增加一次模型调用耗时与成本
7. **图片链接优先级**：AI 整理 Markdown 时会优先保留 Markdown 中已替换过的图片 URL

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
- **Node.js**：需要 v22 或更高版本
