export interface EmailSearchOptions {
  folders?: string[];
  since?: Date;
  before?: Date;
  keywords?: string[];
  limit?: number;
}

export interface EmailMessage {
  uid: number;
  subject: string;
  from: string;
  date: Date;
  folder: string;
  flags: string[];
}

export interface EmailContent {
  uid: number;
  from: string;
  subject: string;
  textSummary: string; // 文本内容摘要（前200字）
  folder: string;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
}

export interface IMAPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  tlsOptions?: any;
}

export interface EmailSearchResult {
  messages: EmailMessage[];
  total: number;
  folders: string[];
}
