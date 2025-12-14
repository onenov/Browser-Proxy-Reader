# 如何获取和使用 Cookies

某些网站（如小红书、知乎等）需要登录才能查看内容。本文档说明如何获取 Cookie 并使用它们来抓取内容。

## 🍪 为什么需要 Cookies？

一些网站有反爬虫机制，要求用户登录后才能查看内容：
- **小红书** - 需要扫码登录验证
- **知乎** - 某些回答需要登录
- **B站专栏** - 部分内容需要登录
- 其他有登录墙的网站

## 📖 如何获取 Cookies

### 方法一：使用浏览器开发者工具（推荐）

1. **打开浏览器开发者工具**
   - Chrome/Edge: `F12` 或 `Cmd+Option+I` (Mac)
   - Firefox: `F12` 或 `Cmd+Option+I` (Mac)

2. **登录目标网站**
   - 在浏览器中正常登录小红书或其他网站

3. **获取 Cookies**
   - 打开 **Application** (或 **存储**) 标签
   - 左侧找到 **Cookies** 
   - 选择对应的域名（如 `xiaohongshu.com`）
   - 复制需要的 Cookie 值

4. **复制整个 Cookie 字符串**
   - 方法 A：在 **Network** 标签中，刷新页面
   - 选择任意请求，在 **Request Headers** 中找到 `Cookie:`
   - 复制整行 Cookie 值

### 方法二：使用浏览器扩展

安装 Cookie 导出扩展（如 EditThisCookie），可以直接导出 JSON 格式的 Cookies。

## 🚀 如何使用 Cookies

### 方式一：使用 POST 接口（推荐）

```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.xiaohongshu.com/explore/xxxxx",
    "format": "json",
    "cookies": [
      {
        "name": "cookie_name",
        "value": "cookie_value",
        "domain": ".xiaohongshu.com"
      }
    ]
  }'
```

### 方式二：JavaScript 调用示例

```javascript
const response = await fetch('http://localhost:3000/api/parse', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://www.xiaohongshu.com/explore/xxxxx',
    format: 'json',
    cookies: [
      {
        name: 'web_session',
        value: 'your_session_value_here',
        domain: '.xiaohongshu.com',
        path: '/',
        httpOnly: true,
        secure: true
      }
    ]
  })
});

const data = await response.json();
console.log(data);
```

### 方式三：Python 调用示例

```python
import requests
import json

url = "http://localhost:3000/api/parse"

payload = {
    "url": "https://www.xiaohongshu.com/explore/xxxxx",
    "format": "json",
    "cookies": [
        {
            "name": "web_session",
            "value": "your_session_value_here",
            "domain": ".xiaohongshu.com",
            "path": "/",
            "httpOnly": True,
            "secure": True
        }
    ]
}

headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, headers=headers, data=json.dumps(payload))
print(response.json())
```

## 🔑 小红书专用 Cookie 格式

小红书主要需要以下 Cookies：

```json
{
  "url": "https://www.xiaohongshu.com/explore/xxxxx",
  "cookies": [
    {
      "name": "web_session",
      "value": "your_web_session_value",
      "domain": ".xiaohongshu.com",
      "path": "/",
      "httpOnly": true,
      "secure": true
    },
    {
      "name": "xhsTrackerId",
      "value": "your_tracker_id",
      "domain": ".xiaohongshu.com",
      "path": "/"
    },
    {
      "name": "a1",
      "value": "your_a1_value",
      "domain": ".xiaohongshu.com",
      "path": "/"
    }
  ]
}
```

## ⚠️ 注意事项

1. **Cookie 安全性**
   - Cookie 包含敏感信息，请妥善保管
   - 不要将 Cookie 提交到公共代码仓库
   - 可以使用环境变量存储 Cookie

2. **Cookie 有效期**
   - Cookies 会过期，需要定期更新
   - 如果返回需要登录的提示，说明 Cookie 已失效

3. **使用环境变量**
   
   在 `.env` 文件中存储 Cookies：
   ```bash
   XHS_COOKIES='[{"name":"web_session","value":"xxx","domain":".xiaohongshu.com"}]'
   ```

4. **法律合规**
   - 仅用于个人学习和研究
   - 遵守网站的使用条款
   - 不要用于商业用途或大规模爬取

## 🌟 支持的网站

目前已优化支持：
- ✅ 微信公众号（无需 Cookie）
- ✅ 小红书（需要 Cookie）
- ✅ 知乎（部分内容需要 Cookie）
- ✅ B站专栏（部分内容需要 Cookie）
- ✅ 其他通用网站

## 🔧 获取完整 Cookie 的快捷脚本

在浏览器控制台运行以下代码，可以快速获取 JSON 格式的 Cookies：

```javascript
// 在登录后的小红书页面控制台运行
const cookies = document.cookie.split('; ').map(c => {
  const [name, value] = c.split('=');
  return {
    name,
    value,
    domain: '.xiaohongshu.com',
    path: '/'
  };
});

console.log(JSON.stringify(cookies, null, 2));
// 复制输出的 JSON 格式 cookies
```

## ❓ 常见问题

### Q: 为什么提供了 Cookie 还是无法访问？
A: 可能的原因：
- Cookie 已过期
- Cookie 不完整
- 网站增加了新的反爬虫机制
- 需要更多的请求头信息

### Q: 如何知道需要哪些 Cookie？
A: 在浏览器开发者工具的 Network 标签中，查看成功请求的 Cookie 字段。

### Q: 安全吗？
A: Cookie 包含敏感信息，建议：
- 只在本地使用
- 使用环境变量存储
- 定期更换密码
- 不要分享给他人

