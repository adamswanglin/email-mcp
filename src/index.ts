#!/usr/bin/env node

// 在开发模式下启用MCP日志
if (process.env.NODE_ENV !== 'production') {
  await import('mcps-logger/console');
}

import dotenv from 'dotenv';
import { EmailMCPServer } from './server.js';

// 加载环境变量
dotenv.config();

async function main() {
  try {
    const server = new EmailMCPServer();
    await server.run();
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

main();
