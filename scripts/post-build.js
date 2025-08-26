#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// 确保dist/index.js有可执行的shebang
const indexPath = path.join(process.cwd(), 'dist', 'index.js');

if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // 如果文件开头没有shebang，则添加
  if (!content.startsWith('#!/usr/bin/env node')) {
    content = '#!/usr/bin/env node\n' + content;
    fs.writeFileSync(indexPath, content);
    console.log('已添加shebang到dist/index.js');
  }
  
  // 设置可执行权限
  try {
    fs.chmodSync(indexPath, 0o755);
    console.log('已设置dist/index.js为可执行');
  } catch (err) {
    console.warn('设置执行权限失败:', err.message);
  }
} else {
  console.error('dist/index.js不存在，请先运行构建命令');
}
