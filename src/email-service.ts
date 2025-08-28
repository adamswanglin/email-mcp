import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { EmailSearchOptions, EmailMessage, IMAPConfig, EmailSearchResult, EmailContent } from './types.js';

export class EmailService {
  private config: IMAPConfig;
  private imap: Imap | null = null;

  constructor(config: IMAPConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap = new Imap({
        ...this.config,
        tls: this.config.secure,
      } as any);

      this.imap.once('ready', () => {
        resolve();
      });

      this.imap.once('error', (err: Error) => {
        reject(err);
      });

      this.imap.connect();
    });
  }

  disconnect(): void {
    if (this.imap) {
      this.imap.end();
      this.imap = null;
    }
  }

  async getMailboxes(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.imap!.getBoxes((err: Error | null, boxes: any) => {
        if (err) {
          reject(err);
          return;
        }

        const mailboxes: string[] = [];
        
        function extractBoxNames(boxList: any, prefix: string = '') {
          for (const name in boxList) {
            const fullName = prefix ? `${prefix}${boxList[name].delimiter}${name}` : name;
            mailboxes.push(fullName);
            
            if (boxList[name].children) {
              extractBoxNames(boxList[name].children, fullName);
            }
          }
        }

        extractBoxNames(boxes);
        resolve(mailboxes);
      });
    });
  }

  async openBox(boxName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.imap!.openBox(boxName, true, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  async searchMessages(criteria: any[]): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.imap!.search(criteria, (err: Error | null, uids: number[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(uids || []);
        }
      });
    });
  }

  async fetchMessages(uids: number[], options?: any): Promise<EmailMessage[]> {
    return new Promise((resolve, reject) => {
      if (uids.length === 0) {
        resolve([]);
        return;
      }

      const fetch = this.imap!.fetch(uids, {
        bodies: 'HEADER.FIELDS (FROM SUBJECT DATE)',
        struct: true,
        envelope: true,
      });

      const messages: EmailMessage[] = [];

      fetch.on('message', (msg: any, seqno: number) => {
        let uid = 0;
        let headers: any = {};
        let flags: string[] = [];

        msg.on('body', (stream: any, info: any) => {
          let buffer = '';
          stream.on('data', (chunk: any) => {
            buffer += chunk.toString('utf8');
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
            subject: headers.subject?.[0] || '',
            from: headers.from?.[0] || '',
            date: new Date(headers.date?.[0] || ''),
            folder: '',
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

      const folders = options.folders || await this.getMailboxes();
      const allMessages: EmailMessage[] = [];
      const searchedFolders: string[] = [];

      for (const folder of folders) {
        try {
          await this.openBox(folder);
          
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

          const uids = await this.searchMessages(criteria.length > 1 ? criteria : ['ALL']);
          
          if (uids.length > 0) {
            const limitedUids = options.limit ? uids.slice(-options.limit) : uids;
            const messages = await this.fetchMessages(limitedUids);
            
            messages.forEach(msg => {
              msg.folder = folder;
            });
            
            allMessages.push(...messages);
            searchedFolders.push(folder);
          }
        } catch (err) {
          console.log(`[DEBUG] 跳过文件夹 ${folder}:`, err);
        }
      }

      const sortedMessages = allMessages.sort((a, b) => b.date.getTime() - a.date.getTime());
      const finalMessages = options.limit ? sortedMessages.slice(0, options.limit) : sortedMessages;

      return {
        messages: finalMessages,
        total: finalMessages.length,
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

  private async fetchEmailContentsByUIDs(uids: number[], folder: string): Promise<EmailContent[]> {
    return new Promise((resolve, reject) => {
      if (uids.length === 0) {
        resolve([]);
        return;
      }

      console.log(`[DEBUG] 开始获取 ${uids.length} 封邮件的内容`);
      const fetch = this.imap!.fetch(uids, {
        bodies: '',
        struct: false,
      });

      const emailContents: EmailContent[] = [];
      let processedCount = 0;
      const totalCount = uids.length;

      fetch.on('message', (msg: any, seqno: number) => {
        let emailBuffer: Buffer | null = null;
        let uid = 0;

        msg.on('body', (stream: any, info: any) => {
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: any) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          stream.once('end', () => {
            emailBuffer = Buffer.concat(chunks);
          });
        });

        msg.once('attributes', (attrs: any) => {
          uid = attrs.uid;
        });

        msg.once('end', async () => {
          processedCount++;
          
          if (emailBuffer && emailBuffer.length > 0) {
            try {
              // 使用mailparser解析邮件
              const parsed = await simpleParser(emailBuffer);
              
              const emailContent: EmailContent = {
                uid,
                from: this.extractSimpleAddress(parsed.from),
                subject: parsed.subject || '无主题',
                textSummary: this.extractTextSummary(parsed.text || parsed.html || ''),
                folder,
              };
              
              emailContents.push(emailContent);
              console.log(`[DEBUG] 成功解析邮件 UID: ${uid}`);
            } catch (error) {
              console.log(`[DEBUG] 解析邮件失败 UID: ${uid}:`, error);
              const emailContent: EmailContent = {
                uid,
                from: '解析失败',
                subject: '解析失败',
                textSummary: '邮件解析失败',
                folder,
              };
              emailContents.push(emailContent);
            }
          } else {
            console.log(`[DEBUG] 邮件 UID: ${uid} 没有接收到数据`);
            const emailContent: EmailContent = {
              uid,
              from: '无数据',
              subject: '无法获取邮件内容',
              textSummary: '邮件内容获取失败',
              folder,
            };
            emailContents.push(emailContent);
          }
          
          // 所有邮件处理完成
          if (processedCount === totalCount) {
            console.log(`[DEBUG] 完成处理，最终结果数量: ${emailContents.length}`);
            resolve(emailContents);
          }
        });
      });

      fetch.once('error', (err: Error) => {
        console.log('[DEBUG] Fetch错误:', err);
        reject(err);
      });
    });
  }

  private extractSimpleAddress(address: any): string {
    if (!address) return '未知发件人';
    
    if (typeof address === 'string') {
      return address;
    }
    
    if (address.text) {
      return address.text;
    }
    
    if (Array.isArray(address) && address.length > 0) {
      const first = address[0];
      return first.name || first.address || '未知发件人';
    }
    
    if (address.name) {
      return address.name;
    }
    
    if (address.address) {
      return address.address;
    }
    
    return '未知发件人';
  }

  private extractTextSummary(text: string): string {
    if (!text || text.trim() === '') {
      return '无内容';
    }
    
    // 移除HTML标签
    let cleanText = text.replace(/<[^>]*>/g, '');
    
    // 移除多余的空白字符
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    
    // 移除常见的邮件签名分隔符
    const signatureDelimiters = [
      '-- ',
      '---',
      '________________________________',
      '此邮件来自',
      'Sent from',
      'Best regards',
      '此致敬礼'
    ];
    
    for (const delimiter of signatureDelimiters) {
      const pos = cleanText.indexOf(delimiter);
      if (pos !== -1) {
        cleanText = cleanText.substring(0, pos);
      }
    }
    
    // 截取前200字符
    if (cleanText.length > 200) {
      return cleanText.substring(0, 200) + '...';
    }
    
    return cleanText || '无可读内容';
  }

  async getEmailContentsByUids(uids: { uid: number; folder: string }[]): Promise<EmailContent[]> {
    try {
      if (!this.imap) {
        await this.connect();
      }

      // 按文件夹分组UID
      const uidsByFolder = new Map<string, number[]>();
      uids.forEach(({ uid, folder }) => {
        if (!uidsByFolder.has(folder)) {
          uidsByFolder.set(folder, []);
        }
        uidsByFolder.get(folder)!.push(uid);
      });

      const allResults: EmailContent[] = [];

      // 批量处理每个文件夹的邮件
      for (const [folder, folderUids] of uidsByFolder) {
        try {
          await this.openBox(folder);
          const contents = await this.fetchEmailContentsByUIDs(folderUids, folder);
          allResults.push(...contents);
        } catch (err) {
          console.log(`[DEBUG] 跳过文件夹 ${folder}:`, err);
        }
      }

      return allResults;

    } finally {
      this.disconnect();
    }
  }

  // 保持向后兼容性的方法 - 已废弃，建议使用getEmailContentsByUids
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
              
              if (uids.length > 0) {
                const contents = await this.fetchEmailContentsByUIDs(uids, folder);
                // 由于简化了EmailContent结构，这里添加所有找到的内容
                results.push(...contents);
                break; // 找到了就跳出，避免重复
              }
            } catch (err) {
              console.log(`[DEBUG] 搜索消息ID ${messageId} 在文件夹 ${folder} 失败:`, err);
            }
          }
        } catch (err) {
          console.log(`[DEBUG] 跳过文件夹 ${folder}:`, err);
        }
      }

      return results;

    } finally {
      this.disconnect();
    }
  }
}