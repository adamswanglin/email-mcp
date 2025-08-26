import Imap from 'imap';
import { EmailSearchOptions, EmailMessage, IMAPConfig, EmailSearchResult, EmailContent } from './types.js';

export class EmailService {
  private config: IMAPConfig;
  private imap: Imap | null = null;

  constructor(config: IMAPConfig) {
    this.config = config;
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap = new Imap({
        host: this.config.host,
        port: this.config.port,
        tls: this.config.secure,
        user: this.config.user,
        password: this.config.password,
        tlsOptions: this.config.tlsOptions,
      });

      this.imap.once('ready', () => {
        resolve();
      });

      this.imap.once('error', (err: Error) => {
        reject(err);
      });

      this.imap.connect();
    });
  }

  private disconnect(): void {
    if (this.imap) {
      this.imap.end();
      this.imap = null;
    }
  }

  async getMailboxes(): Promise<string[]> {
    if (!this.imap) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.imap!.getBoxes((err: Error | null, boxes: any) => {
        if (err) {
          reject(err);
          return;
        }

        const extractBoxNames = (obj: any, prefix = ''): string[] => {
          const names: string[] = [];
          for (const key in obj) {
            const fullName = prefix ? `${prefix}${obj[key].delimiter}${key}` : key;
            names.push(fullName);
            if (obj[key].children) {
              names.push(...extractBoxNames(obj[key].children, fullName));
            }
          }
          return names;
        };

        resolve(extractBoxNames(boxes));
      });
    });
  }

  private openBox(boxName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap!.openBox(boxName, true, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  private searchMessages(criteria: any[]): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.imap!.search(criteria, (err: Error | null, uids: number[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(uids || []);
      });
    });
  }

  private fetchMessages(uids: number[], folder: string): Promise<EmailMessage[]> {
    return new Promise((resolve, reject) => {
      if (uids.length === 0) {
        resolve([]);
        return;
      }

      const messages: EmailMessage[] = [];
      const fetch = this.imap!.fetch(uids, {
        bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)',
        struct: true,
      });

      fetch.on('message', (msg: any, seqno: number) => {
        let headers: any = {};
        let uid = 0;
        let flags: string[] = [];

        msg.on('body', (stream: any) => {
          let buffer = '';
          stream.on('data', (chunk: any) => {
            buffer += chunk.toString('ascii');
          });
          stream.once('end', () => {
            headers = Imap.parseHeader(buffer);
          });
        });

        msg.once('attributes', (attrs: any) => {
          uid = attrs.uid;
          flags = attrs.flags || [];
        });

        msg.once('end', () => {
          const message: EmailMessage = {
            uid,
            messageId: headers['message-id']?.[0] || '',
            subject: headers.subject?.[0] || '',
            from: headers.from?.[0] || '',
            to: headers.to || [],
            date: new Date(headers.date?.[0] || ''),
            folder,
            flags,
          };
          messages.push(message);
        });
      });

      fetch.once('error', (err: Error) => {
        reject(err);
      });

      fetch.once('end', () => {
        resolve(messages);
      });
    });
  }

  async searchEmails(options: EmailSearchOptions = {}): Promise<EmailSearchResult> {
    try {
      if (!this.imap) {
        await this.connect();
      }

      const folders = options.folders && options.folders.length > 0 
        ? options.folders 
        : await this.getMailboxes();

      let allMessages: EmailMessage[] = [];
      const searchedFolders: string[] = [];

      for (const folder of folders) {
        try {
          await this.openBox(folder);
          searchedFolders.push(folder);

          // 构建搜索条件
          const criteria: any[] = ['ALL'];

          if (options.since) {
            criteria.push(['SINCE', options.since]);
          }

          if (options.before) {
            criteria.push(['BEFORE', options.before]);
          }

          if (options.keywords && options.keywords.length > 0) {
            for (const keyword of options.keywords) {
              criteria.push(['OR', ['SUBJECT', keyword], ['BODY', keyword]]);
            }
          }

          const uids = await this.searchMessages(criteria);
          const messages = await this.fetchMessages(uids.slice(0, options.limit || 100), folder);
          allMessages = allMessages.concat(messages);

        } catch (err) {
          console.warn(`跳过文件夹 ${folder}: ${err}`);
        }
      }

      // 按日期排序（最新的在前）
      allMessages.sort((a, b) => b.date.getTime() - a.date.getTime());

      // 应用限制
      if (options.limit) {
        allMessages = allMessages.slice(0, options.limit);
      }

      return {
        messages: allMessages,
        total: allMessages.length,
        folders: searchedFolders,
      };

    } finally {
      this.disconnect();
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      const boxes = await this.getMailboxes();
      return boxes.length > 0;
    } catch (err) {
      return false;
    } finally {
      this.disconnect();
    }
  }

  private fetchEmailContentByUID(uid: number, folder: string): Promise<EmailContent | null> {
    return new Promise((resolve, reject) => {
      const fetch = this.imap!.fetch([uid], {
        bodies: '',
        struct: true,
      });

      let emailContent: Partial<EmailContent> = {
        uid,
        folder,
      };

      fetch.on('message', (msg: any, seqno: number) => {
        let headers: any = {};
        let textContent = '';
        let htmlContent = '';

        msg.on('body', (stream: any, info: any) => {
          let buffer = '';
          stream.on('data', (chunk: any) => {
            buffer += chunk.toString();
          });

          stream.once('end', () => {
            if (info.which === 'HEADER') {
              headers = Imap.parseHeader(buffer);
            } else if (info.which === 'TEXT') {
              if (info.subtype === 'html') {
                htmlContent = buffer;
              } else {
                textContent = buffer;
              }
            }
          });
        });

        msg.once('attributes', (attrs: any) => {
          emailContent.flags = attrs.flags || [];
          
          // 解析邮件结构以获取内容
          if (attrs.struct) {
            this.parseEmailStructure(attrs.struct, emailContent);
          }
        });

        msg.once('end', () => {
          emailContent = {
            ...emailContent,
            messageId: headers['message-id']?.[0] || '',
            subject: headers.subject?.[0] || '',
            from: headers.from?.[0] || '',
            to: headers.to || [],
            cc: headers.cc || [],
            bcc: headers.bcc || [],
            date: new Date(headers.date?.[0] || ''),
            textContent: textContent || undefined,
            htmlContent: htmlContent || undefined,
            headers: this.flattenHeaders(headers),
          };
        });
      });

      fetch.once('error', (err: Error) => {
        reject(err);
      });

      fetch.once('end', () => {
        resolve(emailContent as EmailContent);
      });
    });
  }

  private parseEmailStructure(struct: any, emailContent: Partial<EmailContent>) {
    // 简化的邮件结构解析
    if (Array.isArray(struct)) {
      struct.forEach(part => {
        if (Array.isArray(part)) {
          this.parseEmailStructure(part, emailContent);
        }
      });
    }
  }

  private flattenHeaders(headers: any): Record<string, string> {
    const flattened: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        flattened[key] = (value as string[]).join(', ');
      } else {
        flattened[key] = String(value);
      }
    }
    return flattened;
  }

  async getEmailContentsByMessageIds(messageIds: string[]): Promise<EmailContent[]> {
    try {
      if (!this.imap) {
        await this.connect();
      }

      const folders = await this.getMailboxes();
      const results: EmailContent[] = [];

      for (const folder of folders) {
        try {
          await this.openBox(folder);

          // 为每个messageId搜索
          for (const messageId of messageIds) {
            try {
              const uids = await this.searchMessages([['HEADER', 'MESSAGE-ID', messageId]]);
              
              for (const uid of uids) {
                const content = await this.fetchEmailContentByUID(uid, folder);
                if (content && content.messageId === messageId) {
                  results.push(content);
                  break; // 找到了就跳出，避免重复
                }
              }
            } catch (err) {
              console.warn(`搜索消息ID ${messageId} 在文件夹 ${folder} 失败:`, err);
            }
          }
        } catch (err) {
          console.warn(`跳过文件夹 ${folder}:`, err);
        }
      }

      return results;

    } finally {
      this.disconnect();
    }
  }
}
