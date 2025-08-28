# Email MCP 服务 Makefile
# 项目地址: https://github.com/adamswanglin/email-mcp

# 变量定义
NODE_VERSION := $(shell node --version 2>/dev/null || echo "未安装")
NPM_VERSION := $(shell npm --version 2>/dev/null || echo "未安装")
PACKAGE_NAME := @adamswanglin/email-mcp
DIST_DIR := dist
SRC_DIR := src
SCRIPTS_DIR := scripts

# 颜色定义
COLOR_RESET := \033[0m
COLOR_GREEN := \033[32m
COLOR_YELLOW := \033[33m
COLOR_BLUE := \033[34m
COLOR_RED := \033[31m

# 默认目标
.DEFAULT_GOAL := help

# 检查环境
.PHONY: check-env
check-env:
	@echo "$(COLOR_BLUE)检查开发环境...$(COLOR_RESET)"
	@echo "Node.js 版本: $(NODE_VERSION)"
	@echo "NPM 版本: $(NPM_VERSION)"
	@if [ "$(NODE_VERSION)" = "未安装" ]; then \
		echo "$(COLOR_RED)错误: 请先安装 Node.js$(COLOR_RESET)"; \
		exit 1; \
	fi
	@if [ "$(NPM_VERSION)" = "未安装" ]; then \
		echo "$(COLOR_RED)错误: 请先安装 NPM$(COLOR_RESET)"; \
		exit 1; \
	fi
	@echo "$(COLOR_GREEN)环境检查通过!$(COLOR_RESET)"

# 安装依赖
.PHONY: install
install: check-env
	@echo "$(COLOR_BLUE)安装项目依赖...$(COLOR_RESET)"
	npm install
	@echo "$(COLOR_GREEN)依赖安装完成!$(COLOR_RESET)"

# 清理构建文件
.PHONY: clean
clean:
	@echo "$(COLOR_BLUE)清理构建文件...$(COLOR_RESET)"
	rm -rf $(DIST_DIR)
	rm -rf node_modules/.cache
	@echo "$(COLOR_GREEN)清理完成!$(COLOR_RESET)"

# TypeScript 编译
.PHONY: compile
compile: check-env
	@echo "$(COLOR_BLUE)编译 TypeScript 代码...$(COLOR_RESET)"
	npx tsc
	@echo "$(COLOR_GREEN)TypeScript 编译完成!$(COLOR_RESET)"

# 执行后构建脚本
.PHONY: post-build
post-build:
	@echo "$(COLOR_BLUE)执行后构建处理...$(COLOR_RESET)"
	node $(SCRIPTS_DIR)/post-build.js
	@echo "$(COLOR_GREEN)后构建处理完成!$(COLOR_RESET)"

# 完整构建
.PHONY: build
build: clean compile post-build
	@echo "$(COLOR_GREEN)项目构建完成!$(COLOR_RESET)"

# 快速构建 (不清理)
.PHONY: build-fast
build-fast: compile post-build
	@echo "$(COLOR_GREEN)快速构建完成!$(COLOR_RESET)"

# 开发模式运行
.PHONY: dev
dev: check-env
	@echo "$(COLOR_BLUE)启动开发模式...$(COLOR_RESET)"
	npm run dev

# 生产模式运行
.PHONY: start
start: check-env
	@echo "$(COLOR_BLUE)启动生产服务...$(COLOR_RESET)"
	@if [ ! -f "$(DIST_DIR)/index.js" ]; then \
		echo "$(COLOR_YELLOW)构建文件不存在，正在构建...$(COLOR_RESET)"; \
		$(MAKE) build; \
	fi
	npm start

# 测试连接
.PHONY: test-connection
test-connection: start
	@echo "$(COLOR_BLUE)测试IMAP连接...$(COLOR_RESET)"
	@echo "$(COLOR_YELLOW)注意: 请确保已正确配置 .env 文件$(COLOR_RESET)"

# 环境配置
.PHONY: setup-env
setup-env:
	@echo "$(COLOR_BLUE)设置环境配置...$(COLOR_RESET)"
	@if [ ! -f ".env" ]; then \
		cp env.example .env; \
		echo "$(COLOR_GREEN)已创建 .env 文件，请编辑配置您的IMAP设置$(COLOR_RESET)"; \
		echo "$(COLOR_YELLOW)编辑 .env 文件以配置您的邮箱设置:$(COLOR_RESET)"; \
		echo "  - IMAP_HOST: IMAP服务器地址"; \
		echo "  - IMAP_PORT: IMAP端口 (通常是993)"; \
		echo "  - EMAIL_USER: 您的邮箱地址"; \
		echo "  - EMAIL_PASSWORD: 您的邮箱密码或应用密码"; \
	else \
		echo "$(COLOR_YELLOW).env 文件已存在$(COLOR_RESET)"; \
	fi

# 代码检查
.PHONY: lint
lint: check-env
	@echo "$(COLOR_BLUE)检查代码质量...$(COLOR_RESET)"
	@if command -v eslint >/dev/null 2>&1; then \
		npx eslint $(SRC_DIR)/**/*.ts; \
	else \
		echo "$(COLOR_YELLOW)ESLint 未安装，跳过代码检查$(COLOR_RESET)"; \
	fi

# 类型检查
.PHONY: type-check
type-check: check-env
	@echo "$(COLOR_BLUE)执行TypeScript类型检查...$(COLOR_RESET)"
	npx tsc --noEmit
	@echo "$(COLOR_GREEN)类型检查通过!$(COLOR_RESET)"

# 包发布准备
.PHONY: prepack
prepack: build
	@echo "$(COLOR_BLUE)准备发布包...$(COLOR_RESET)"
	npm run prepack
	@echo "$(COLOR_GREEN)发布准备完成!$(COLOR_RESET)"

# 发布到NPM
.PHONY: publish
publish: prepack
	@echo "$(COLOR_BLUE)发布到NPM...$(COLOR_RESET)"
	@echo "$(COLOR_YELLOW)请确认您已登录NPM账户$(COLOR_RESET)"
	npm publish
	@echo "$(COLOR_GREEN)发布完成!$(COLOR_RESET)"

# 发布测试版本
.PHONY: publish-beta
publish-beta: prepack
	@echo "$(COLOR_BLUE)发布测试版本到NPM...$(COLOR_RESET)"
	npm publish --tag beta
	@echo "$(COLOR_GREEN)测试版本发布完成!$(COLOR_RESET)"

# 全局安装
.PHONY: install-global
install-global: build
	@echo "$(COLOR_BLUE)全局安装 email-mcp...$(COLOR_RESET)"
	npm install -g .
	@echo "$(COLOR_GREEN)全局安装完成! 您现在可以在任何地方使用 'email-mcp' 命令$(COLOR_RESET)"

# 全局卸载
.PHONY: uninstall-global
uninstall-global:
	@echo "$(COLOR_BLUE)全局卸载 email-mcp...$(COLOR_RESET)"
	npm uninstall -g $(PACKAGE_NAME)
	@echo "$(COLOR_GREEN)全局卸载完成!$(COLOR_RESET)"

# 查看版本信息
.PHONY: version
version:
	@echo "$(COLOR_BLUE)版本信息:$(COLOR_RESET)"
	@echo "项目版本: $(shell node -p "require('./package.json').version")"
	@echo "Node.js: $(NODE_VERSION)"
	@echo "NPM: $(NPM_VERSION)"

# 查看项目状态
.PHONY: status
status:
	@echo "$(COLOR_BLUE)项目状态:$(COLOR_RESET)"
	@echo "项目名称: $(PACKAGE_NAME)"
	@echo "构建目录: $(DIST_DIR)"
	@echo "源代码目录: $(SRC_DIR)"
	@if [ -d "$(DIST_DIR)" ]; then \
		echo "$(COLOR_GREEN)构建状态: 已构建$(COLOR_RESET)"; \
	else \
		echo "$(COLOR_YELLOW)构建状态: 未构建$(COLOR_RESET)"; \
	fi
	@if [ -f ".env" ]; then \
		echo "$(COLOR_GREEN)环境配置: 已配置$(COLOR_RESET)"; \
	else \
		echo "$(COLOR_YELLOW)环境配置: 未配置$(COLOR_RESET)"; \
	fi

# 完整初始化 (新开发者使用)
.PHONY: init
init: check-env install setup-env
	@echo "$(COLOR_GREEN)项目初始化完成!$(COLOR_RESET)"
	@echo "$(COLOR_BLUE)下一步:$(COLOR_RESET)"
	@echo "1. 编辑 .env 文件配置您的IMAP设置"
	@echo "2. 运行 'make build' 构建项目"
	@echo "3. 运行 'make start' 启动服务"

# 开发环境完整设置
.PHONY: setup-dev
setup-dev: init build
	@echo "$(COLOR_GREEN)开发环境设置完成!$(COLOR_RESET)"
	@echo "$(COLOR_BLUE)您现在可以:$(COLOR_RESET)"
	@echo "- 运行 'make dev' 启动开发模式"
	@echo "- 运行 'make start' 启动生产模式"
	@echo "- 运行 'make test-connection' 测试连接"

# 监视文件变化并自动重建
.PHONY: watch
watch: check-env
	@echo "$(COLOR_BLUE)监视文件变化并自动构建...$(COLOR_RESET)"
	@echo "$(COLOR_YELLOW)按 Ctrl+C 停止监视$(COLOR_RESET)"
	@while true; do \
		inotifywait -q -r -e modify,create,delete $(SRC_DIR) 2>/dev/null || \
		(echo "$(COLOR_YELLOW)inotifywait 不可用，使用简单轮询...$(COLOR_RESET)" && sleep 2); \
		$(MAKE) build-fast; \
		echo "$(COLOR_GREEN)重新构建完成，继续监视...$(COLOR_RESET)"; \
	done

# 清理所有生成文件和依赖
.PHONY: clean-all
clean-all: clean
	@echo "$(COLOR_BLUE)清理所有文件...$(COLOR_RESET)"
	rm -rf node_modules
	rm -f package-lock.json
	@echo "$(COLOR_GREEN)清理完成!$(COLOR_RESET)"

# 重新安装所有依赖
.PHONY: reinstall
reinstall: clean-all install
	@echo "$(COLOR_GREEN)重新安装完成!$(COLOR_RESET)"

# 显示帮助信息
.PHONY: help
help:
	@echo "$(COLOR_BLUE)Email MCP 服务 - 可用命令:$(COLOR_RESET)"
	@echo ""
	@echo "$(COLOR_GREEN)初始化和设置:$(COLOR_RESET)"
	@echo "  make init           - 完整项目初始化 (新开发者)"
	@echo "  make setup-dev      - 开发环境完整设置"
	@echo "  make setup-env      - 创建环境配置文件"
	@echo "  make install        - 安装依赖"
	@echo ""
	@echo "$(COLOR_GREEN)构建和开发:$(COLOR_RESET)"
	@echo "  make build          - 完整构建项目"
	@echo "  make build-fast     - 快速构建 (不清理)"
	@echo "  make compile        - 仅编译 TypeScript"
	@echo "  make clean          - 清理构建文件"
	@echo "  make dev            - 开发模式运行"
	@echo "  make watch          - 监视文件变化并自动构建"
	@echo ""
	@echo "$(COLOR_GREEN)运行和测试:$(COLOR_RESET)"
	@echo "  make start          - 生产模式运行"
	@echo "  make test-connection - 测试IMAP连接"
	@echo ""
	@echo "$(COLOR_GREEN)代码质量:$(COLOR_RESET)"
	@echo "  make lint           - 代码质量检查"
	@echo "  make type-check     - TypeScript类型检查"
	@echo ""
	@echo "$(COLOR_GREEN)发布和安装:$(COLOR_RESET)"
	@echo "  make publish        - 发布到NPM"
	@echo "  make publish-beta   - 发布测试版本"
	@echo "  make install-global - 全局安装"
	@echo "  make uninstall-global - 全局卸载"
	@echo ""
	@echo "$(COLOR_GREEN)信息和维护:$(COLOR_RESET)"
	@echo "  make version        - 查看版本信息"
	@echo "  make status         - 查看项目状态"
	@echo "  make check-env      - 检查开发环境"
	@echo "  make clean-all      - 清理所有文件和依赖"
	@echo "  make reinstall      - 重新安装所有依赖"
	@echo "  make help           - 显示此帮助信息"
	@echo ""
	@echo "$(COLOR_YELLOW)快速开始:$(COLOR_RESET)"
	@echo "  1. make init        # 初始化项目"
	@echo "  2. 编辑 .env 文件     # 配置IMAP设置"
	@echo "  3. make start       # 启动服务"
