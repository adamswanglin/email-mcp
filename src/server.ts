import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { EmailService } from './email-service.js';
import { EmailSearchOptions, IMAPConfig } from './types.js';

export class EmailMCPServer {
  private server: Server;
  private emailService: EmailService | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'email-mcp',
        version: '1.0.0',
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_emails',
            description: '搜索邮件。支持按文件夹、时间范围和关键词搜索。',
            inputSchema: {
              type: 'object',
              properties: {
                folders: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '要搜索的邮件文件夹列表（可选，默认搜索所有文件夹）',
                },
                since: {
                  type: 'string',
                  format: 'date',
                  description: '搜索此日期之后的邮件（YYYY-MM-DD格式）',
                },
                before: {
                  type: 'string',
                  format: 'date',
                  description: '搜索此日期之前的邮件（YYYY-MM-DD格式）',
                },
                keywords: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '要搜索的关键词列表（在主题和正文中搜索）',
                },
                limit: {
                  type: 'number',
                  description: '返回结果的最大数量（默认100）',
                  default: 100,
                },
              },
            },
          },
          {
            name: 'list_mailboxes',
            description: '获取所有可用的邮件文件夹列表',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'test_connection',
            description: '测试IMAP连接是否正常',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_email_contents',
            description: '根据消息ID批量获取邮件的完整内容，包括文本、HTML内容和头信息',
            inputSchema: {
              type: 'object',
              properties: {
                messageIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '要获取内容的邮件消息ID列表',
                  minItems: 1,
                },
              },
              required: ['messageIds'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (!this.emailService) {
          this.initializeEmailService();
        }

        switch (name) {
          case 'search_emails': {
            const options: EmailSearchOptions = {};
            
            if (args?.folders && Array.isArray(args.folders)) {
              options.folders = args.folders;
            }
            
            if (args?.since && typeof args.since === 'string') {
              options.since = new Date(args.since);
            }
            
            if (args?.before && typeof args.before === 'string') {
              options.before = new Date(args.before);
            }
            
            if (args?.keywords && Array.isArray(args.keywords)) {
              options.keywords = args.keywords;
            }
            
            if (args?.limit && typeof args.limit === 'number') {
              options.limit = args.limit;
            }

            const result = await this.emailService!.searchEmails(options);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    summary: `找到 ${result.total} 封邮件，搜索了 ${result.folders.length} 个文件夹`,
                    result,
                  }, null, 2),
                },
              ],
            };
          }

          case 'list_mailboxes': {
            const mailboxes = await this.emailService!.getMailboxes();
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    summary: `找到 ${mailboxes.length} 个邮件文件夹`,
                    mailboxes,
                  }, null, 2),
                },
              ],
            };
          }

          case 'test_connection': {
            const isConnected = await this.emailService!.testConnection();
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    status: isConnected ? 'success' : 'failed',
                    message: isConnected ? 'IMAP连接测试成功' : 'IMAP连接测试失败',
                  }, null, 2),
                },
              ],
            };
          }

          case 'get_email_contents': {
            if (!args?.messageIds || !Array.isArray(args.messageIds)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                '必须提供messageIds数组参数'
              );
            }

            const messageIds = args.messageIds as string[];
            const contents = await this.emailService!.getEmailContentsByMessageIds(messageIds);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    summary: `成功获取 ${contents.length} 封邮件的内容（共查询 ${messageIds.length} 个消息ID）`,
                    requestedCount: messageIds.length,
                    foundCount: contents.length,
                    contents,
                  }, null, 2),
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `未知工具: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        throw new McpError(
          ErrorCode.InternalError,
          `工具执行失败: ${errorMessage}`
        );
      }
    });
  }

  private initializeEmailService() {
    const config: IMAPConfig = {
      host: process.env.IMAP_HOST || '',
      port: parseInt(process.env.IMAP_PORT || '993'),
      secure: process.env.IMAP_SECURE !== 'false',
      user: process.env.EMAIL_USER || '',
      password: process.env.EMAIL_PASSWORD || '',
      tlsOptions: process.env.IMAP_TLS_OPTIONS ? JSON.parse(process.env.IMAP_TLS_OPTIONS) : {},
    };

    if (!config.host || !config.user || !config.password) {
      throw new Error('缺少必要的IMAP配置。请检查环境变量: IMAP_HOST, EMAIL_USER, EMAIL_PASSWORD');
    }

    this.emailService = new EmailService(config);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('邮件MCP服务器已启动');
  }
}
