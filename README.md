# 星云编年史 · Nebula Chronicle

> 一款融合动漫编年史可视化、AI 语音助手与手势控制的沉浸式网页应用。

## 在线体验

若仓库已启用 GitHub Pages，可直接访问：

- **登录页**：https://mw2wbyys6t-sudo.github.io/wonderful-screen/login.html
- **主应用**：https://mw2wbyys6t-sudo.github.io/wonderful-screen/nebula-chronicle.html
- **播放页**：https://mw2wbyys6t-sudo.github.io/wonderful-screen/watch.html

## 项目简介

《星云编年史》以 1963 年至今的经典日本动画为数据基础，将时间轴化作可探索的星云次元。用户可以通过语音或手势与系统交互，让 LLM 助手帮忙查找、播放作品，也能在闲暇时切换到闲聊模式进行日常对话。

本项目为纯前端实现，无需后端即可运行；LLM 与 TTS 能力直接调用浏览器及第三方 API。

## 主要功能

### 1. 动漫编年史可视化
- 基于 Three.js 的星云背景与螺旋时间轴
- 按年份、类型、作品展示经典动画卡片
- 点击作品可查看详情，并跳转播放页

### 2. LLM 多轮语音助手
- **命令模式**：通过语音/文字指令查找作品、控制播放、询问信息
- **闲聊模式**：切换后进入日常对话，支持多轮上下文记忆（默认保留最近 10 轮）
- 语音合成（Web Speech API）自动朗读助手回复
- 支持 `js/llm-config.js` 配置自有 API Key

### 3. 手势与语音控制
- 集成 MediaPipe Hands，支持摄像头手势识别
- 语音指令可控制播放、暂停、上一部、下一部等操作
- 播放页支持 Bilibili BV 号或本地视频源

### 4. Liquid Glass 风格登录页
- 独立登录页 `/login.html`，采用苹果 Liquid Glass 设计语言
- 8 位历届世界最萌大会（ISML）冠军女主角海报轮播：
  薇尔莉特 · 伊芙加登、秋山澪、立华奏、夏娜、加藤惠、雷姆、伊蕾娜、御坂美琴
- 玻璃态登录卡片、鼠标跟随高光、动态光斑、Ken Burns 背景动效
- 登录后自动跳转至主应用

## 项目结构

```
/workspace
├── login.html              # Liquid Glass 风格登录页
├── nebula-chronicle.html   # 主应用：星云编年史 + AI 助手
├── watch.html              # 播放页：手势/语音控制视频播放
├── liquid-glass-demo.html  # Liquid Glass 效果 Demo
├── images/                 # 动漫封面图与登录角色海报
│   ├── login/
│   │   ├── violet-evergarden.png
│   │   ├── akiyama-mio.jpg
│   │   ├── tachibana-kanade.jpg
│   │   ├── shana.jpg
│   │   ├── kato-megumi.jpg
│   │   ├── rem.jpg
│   │   ├── elaina.jpg
│   │   └── misaka-mikoto.jpg
│   └── 0.jpg ~ 41.jpg      # 动漫编年史封面
├── js/
│   ├── shared-data.js      # 动漫数据库与视频链接
│   ├── shared-utils.js     # 公共工具函数
│   ├── llm-engine.js       # LLM 助手核心逻辑
│   ├── llm-config.template.js  # API Key 配置模板
│   └── llm-config.js       # 实际 API Key 配置（已加入 .gitignore）
├── check-syntax.js         # 内联脚本语法检查
├── test-pages.py           # Playwright 页面功能测试
├── test-static.js          # 静态资源测试
└── docs/                   # 需求与设计文档
```

## 快速开始

### 本地运行

```bash
cd /workspace
python3 -m http.server 8080
```

然后打开浏览器访问：

- 登录页：http://localhost:8080/login.html
- 主应用：http://localhost:8080/nebula-chronicle.html
- 播放页：http://localhost:8080/watch.html?index=14

### 配置 LLM API Key

1. 复制配置模板：
   ```bash
   cp js/llm-config.template.js js/llm-config.js
   ```
2. 编辑 `js/llm-config.js`，填入你的 API Key 与模型地址。
3. 由于 `js/llm-config.js` 已加入 `.gitignore`，Key 不会被提交到仓库。

## 技术栈

- **前端**：原生 HTML5 / CSS3 / ES6+
- **3D 渲染**：Three.js
- **手势识别**：MediaPipe Hands
- **语音交互**：Web Speech API（语音识别 + 语音合成）
- **LLM**：兼容 OpenAI 风格接口（本项目使用 LongCat / Modellix GPT-Image-2 等）
- **图像生成**：GPT Image 2（角色海报）
- **测试**：Playwright（页面功能）、Node.js Function 构造器（语法检查）

## 测试

### 语法检查

```bash
node check-syntax.js
```

### 页面功能测试（需先启动本地服务器）

```bash
python3 -m http.server 8080 &
python3 test-pages.py
```

## 注意事项

- `js/llm-config.js` 包含私人 API Key，已被 `.gitignore` 排除，请勿手动将其加入版本控制。
- 首次加载主应用时会请求摄像头权限，用于手势识别；仅用于本地处理，不会上传。
- 播放页默认优先读取 `shared-data.js` 中的 `bilibili` BV 号或 `videoUrl`，未配置时会显示"暂无片源"占位。

## 未来计划

- 接入更多视频源与真实 Bilibili 播放器
- 优化手势识别的稳定性与指令覆盖
- 扩展 LLM 助手的动漫知识库与推荐能力
- 为登录页增加更多动态效果与音效

---

**作者**：mw2wbyys6t-sudo  
**License**：MIT
