declare module 'imap' {
  export interface ImapOptions {
    host: string;
    port: number;
    tls: boolean;
    user: string;
    password: string;
    tlsOptions?: any;
  }

  export interface ImapMessage {
    on(event: 'body', listener: (stream: any, info?: any) => void): void;
    once(event: 'attributes', listener: (attrs: any) => void): void;
    once(event: 'end', listener: () => void): void;
  }

  export interface ImapFetch {
    on(event: 'message', listener: (msg: ImapMessage, seqno: number) => void): void;
    once(event: 'error', listener: (err: Error) => void): void;
    once(event: 'end', listener: () => void): void;
  }

  export default class Imap {
    constructor(options: ImapOptions);
    
    connect(): void;
    end(): void;
    
    once(event: 'ready', listener: () => void): void;
    once(event: 'error', listener: (err: Error) => void): void;
    
    getBoxes(callback: (err: Error | null, boxes: any) => void): void;
    openBox(name: string, readOnly: boolean, callback: (err: Error | null) => void): void;
    search(criteria: any[], callback: (err: Error | null, uids: number[]) => void): void;
    fetch(source: number[], options: any): ImapFetch;
    
    static parseHeader(rawHeader: string): any;
  }
}
