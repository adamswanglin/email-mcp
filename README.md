# Email MCP 服务

[![NPM Version](https://img.shields.io/npm/v/@adamswanglin/email-mcp)](https://www.npmjs.com/package/@adamswanglin/email-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-adamswanglin%2Femail--mcp-blue)](https://github.com/adamswanglin/email-mcp)

这是一个基于Model Context Protocol (MCP)的邮件查询服务，提供IMAP协议的邮件搜索和管理功能。

## 功能特性

- 🔍 **邮件搜索**: 支持按文件夹、时间范围和关键词搜索邮件
- 📧 **邮件内容**: 批量获取邮件完整内容，包括文本、HTML和附件信息
- 📁 **文件夹管理**: 获取和浏览所有邮件文件夹
- 🔗 **IMAP支持**: 兼容所有标准IMAP服务器
- ⚡ **快速执行**: 通过npx直接运行，无需全局安装
- 🔒 **安全配置**: 支持环境变量配置敏感信息

## 安装和使用

### 环境要求

- Node.js 18.0+
- 支持IMAP的邮箱账户

### 快速开始

1. **克隆或下载项目**
   ```bash
   git clone https://github.com/adamswanglin/email-mcp.git
   cd email-mcp
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   
   复制示例配置文件：
   ```bash
   cp env.example .env
   ```
   
   编辑 `.env` 文件，填入您的IMAP配置：
   ```env
   # IMAP服务器配置
   IMAP_HOST=imap.gmail.com
   IMAP_PORT=993
   IMAP_SECURE=true
   
   # 邮箱账户信息
   EMAIL_USER=your.email@gmail.com
   EMAIL_PASSWORD=your_app_password
   
   # 可选配置
   IMAP_TLS_OPTIONS={}
   ```

4. **构建项目**
   ```bash
   npm run build
   ```

5. **运行服务**
   ```bash
   npm start
   # 或者使用npx
   npx email-mcp
   ```

### NPX 直接执行

如果项目已发布到npm，可以直接使用npx运行：

```bash
# 安装
npm install -g @adamswanglin/email-mcp

# 或直接运行（设置环境变量后）
IMAP_HOST=imap.gmail.com EMAIL_USER=your@email.com EMAIL_PASSWORD=password npx @adamswanglin/email-mcp
```

## 常见IMAP服务器配置

### Gmail
```env
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_SECURE=true
```

### Outlook/Hotmail
```env
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
IMAP_SECURE=true
```

### QQ邮箱
```env
IMAP_HOST=imap.qq.com
IMAP_PORT=993
IMAP_SECURE=true
```

### 163邮箱
```env
IMAP_HOST=imap.163.com
IMAP_PORT=993
IMAP_SECURE=true
```

## MCP工具说明

本服务提供以下MCP工具：

### 1. search_emails
搜索邮件，支持多种过滤条件。

**参数：**
- `folders` (可选): 要搜索的文件夹列表
- `since` (可选): 搜索此日期之后的邮件 (YYYY-MM-DD)
- `before` (可选): 搜索此日期之前的邮件 (YYYY-MM-DD)  
- `keywords` (可选): 关键词列表（在主题和正文中搜索）
- `limit` (可选): 最大返回数量，默认100

**示例：**
```json
{
  "folders": ["INBOX", "Sent"],
  "since": "2024-01-01",
  "keywords": ["重要", "会议"],
  "limit": 50
}
```

### 2. get_email_contents 🆕
根据消息ID批量获取邮件的完整内容。

**参数：**
- `messageIds` (必需): 消息ID数组

**返回内容：**
- 邮件完整头信息
- 文本内容（textContent）
- HTML内容（htmlContent）  
- 附件信息
- 邮件标志和文件夹信息

**示例：**
```json
{
  "messageIds": [
    "<message-id-1@example.com>",
    "<message-id-2@example.com>"
  ]
}
```

### 3. list_mailboxes
获取所有可用的邮件文件夹列表。

**参数：** 无

### 4. test_connection
测试IMAP连接是否正常。

**参数：** 无

## 开发模式

对于开发和调试：

```bash
# 开发模式运行（使用tsx）
npm run dev

# 构建项目
npm run build

# 运行构建后的版本
npm start
```

## 安全注意事项

1. **应用密码**: 对于Gmail等服务，建议使用应用专用密码而不是主密码
2. **环境变量**: 永远不要将包含密码的 `.env` 文件提交到版本控制
3. **TLS加密**: 确保 `IMAP_SECURE=true` 以使用加密连接
4. **防火墙**: 确保IMAP端口（通常是993）没有被防火墙阻止

## 故障排除

### 连接失败
- 检查IMAP服务器地址和端口
- 确认邮箱已启用IMAP功能
- 验证用户名和密码/应用密码
- 检查网络连接和防火墙设置

### 权限错误
- 对于Gmail，确保启用了"不够安全的应用访问"或使用应用密码
- 对于企业邮箱，联系管理员确认IMAP访问权限

### 性能问题
- 减少搜索的文件夹数量
- 缩小时间范围
- 降低结果限制数量

## 版本历史

### v1.1.0 (最新)
- 🆕 新增 `get_email_contents` 工具，支持批量获取邮件完整内容
- ✨ 支持获取邮件的文本和HTML内容
- 🔧 改进邮件内容解析功能

### v1.0.1
- 🐛 修复bin路径问题
- 📦 优化包发布配置

### v1.0.0
- 🎉 首次发布
- ✅ 基础邮件搜索功能
- ✅ 文件夹列表功能
- ✅ 连接测试功能

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 贡献

欢迎提交问题和拉取请求来改进这个项目！

1. Fork 项目
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 支持

如果您遇到问题或有建议，请：

1. 查看 [Issues](https://github.com/adamswanglin/email-mcp/issues) 页面
2. 创建新的 Issue 描述您的问题
3. 或者直接提交 Pull Request

## 作者

[@adamswanglin](https://github.com/adamswanglin)
