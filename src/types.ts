export interface EmailSearchOptions {
  folders?: string[];
  since?: Date;
  before?: Date;
  keywords?: string[];
  limit?: number;
}

export interface EmailMessage {
  uid: number;
  messageId: string;
  subject: string;
  from: string;
  to: string[];
  date: Date;
  folder: string;
  flags: string[];
  snippet?: string;
}

export interface EmailContent {
  messageId: string;
  uid: number;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  date: Date;
  folder: string;
  flags: string[];
  textContent?: string;
  htmlContent?: string;
  attachments?: EmailAttachment[];
  headers: Record<string, string>;
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
