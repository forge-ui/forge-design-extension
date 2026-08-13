# Forge Design

基于 Forge UI 的设计工具：在真实网页上点选组件，用你本地的 Grok 改界面、调交互、调试 Web 应用。

## 架构

```
AI / CLI  --HTTP-->  本机 server(:3847)  --WebSocket-->  Chrome 插件  -->  当前页 / 后台页签
```

**静默模式（默认）**：所有 `goto` / 点击 / 填表都在专用 agent 页签后台执行，你正在用的页签保持在前台。  
需要前台时显式传 `foreground: true` 或命令 `focus`。

## 安装

插件只是界面。对话和改页面需要本机桥接服务（连你本地的 Grok）。

### 1. 启动本机桥接

```bash
curl -fsSL https://raw.githubusercontent.com/forge-ui/forge-design-extension/main/install.sh | bash
```

会安装依赖、拉起 `127.0.0.1:3847`，并在 macOS 上写成开机自启。需要本机已有 Node.js 和 Grok CLI。

开发时也可以在仓库里执行：

```bash
./install.sh
```

可选：把项目 skill 装到本机 Grok，让对话时自动带上点选/改页面的用法：

```bash
./install-skill.sh
```

### 2. 安装插件到真 Chrome

1. 打开 `chrome://extensions`
2. 打开右上角 **开发者模式**
3. **加载已解压的扩展程序**
4. 选择带有 `manifest.json` 的 `extension/` 目录
5. 点插件图标会直接打开侧边栏

侧边栏连上服务前会显示安装命令。服务就绪后会自动连上。

### 侧边栏对话

1. 点插件图标打开侧边栏
2. 可以新开对话，也可以点标题拉取本机 `~/.grok/sessions`
3. 侧边栏和终端里的 Grok 共用同一个 session：点 ··· 可在 Terminal 打开当前会话
4. 先点输入框左下角「选择以编辑」，再说话，Grok 会带上选中的 selector

### 页面点选

1. 打开要改的页面
2. 在侧边栏点「选择以编辑」
3. 点击页面上的目标（Esc 取消）
4. Grok / CLI 读取刚才选中的元素：

```bash
cd server
npm run cli -- last-pick
```

### 3. 测试

另开一个终端：

```bash
cd server
npm run cli -- status
npm run cli -- goto http://localhost:3000
npm run cli -- snapshot
```

## CLI 命令

| 命令 | 作用 |
|------|------|
| `status` | 连接状态 / 当前标签 |
| `tabs` | 所有标签 |
| `goto <url>` | 当前标签跳转 |
| `snapshot` | 页面文本 + 可点元素 |
| `click <selector>` | 点击 |
| `fill <sel> <text>` | 填入输入框 |
| `type <text>` | 向当前焦点输入 |
| `press Enter` | 按键 |
| `text` | 页面纯文本 |
| `wait <selector>` | 等待元素 |

## HTTP API

```bash
TOKEN=$(node -e "console.log(require('./.bridge-state.json').token)" 2>/dev/null || cat ../.bridge-state.json | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

curl -s -X POST http://127.0.0.1:3847/command \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"command":"status"}'
```

## 安全

- 服务只监听 `127.0.0.1`，仅本机可访问。
- 本机 token 只存在 `.bridge-state.json`（已 gitignore）和本机 Chrome 扩展存储里。
- token 只用于本机插件和桥之间配对。请把它留在本机配置里。
- 插件只在你自己的 Chrome 里跑；截图、点选、页面内容都留在本机。
- 发帖、付款、删数据这类操作请先确认后再执行。

## 说明

Forge Design 给开发调试 Web 系统用：在真实 Chrome 里打开你的应用，点选组件，让本地 Grok 按选中的元素改文案、样式和交互。

## License

MIT
