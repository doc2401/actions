# 共享多语言内容部署 Actions

本仓库提供了可复用的 GitHub Actions 工作流，用于构建多语言静态页面并生成 `sitemap.xml` 文件。

通过本共享工作流，其他项目只需要在根目录下维护一个 `lang.json` 配置文件，并直接下载/引入本仓库的部署工作流即可。

---

## 1. 一键下载初始化文件

您无需手动复制粘贴配置内容。请在您的项目根目录下打开终端，运行以下命令，即可直接下载并创建 `lang.json` 配置模板与 `.github/workflows/lang-deploy.yml` 工作流文件：

### Linux / macOS / Git Bash
```bash
# 下载 lang.json 配置文件
curl -fsSL https://raw.githubusercontent.com/doc2401/actions/main/lang/lang.json -o lang.json

# 创建目录并下载工作流文件
mkdir -p .github/workflows && curl -fsSL https://raw.githubusercontent.com/doc2401/actions/main/lang/deploy-example.yml -o .github/workflows/lang-deploy.yml
```

### PowerShell
```powershell
# 下载 lang.json 配置文件
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/doc2401/actions/main/lang/lang.json" -OutFile "lang.json"

# 创建目录并下载工作流文件
New-Item -ItemType Directory -Force -Path .github/workflows
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/doc2401/actions/main/lang/deploy-example.yml" -OutFile ".github/workflows/lang-deploy.yml"
```

---

## 2. 推送并运行

完成上述两步后，直接将 `.github/workflows/lang-deploy.yml` 和 `lang.json` 提交并推送到您的 `lang` 分支：

```bash
git add lang.json .github/workflows/lang-deploy.yml
git commit -m "chore: add pages deploy workflow"
git push origin lang
```

GitHub Actions 将会自动开始执行多语言页面的构建与部署。

---

## 3. 核心架构解析：三个 YAML 文件的关系

为了兼顾**“极简的接入体验”**与**“中心化的高效维护”**，本部署方案采用了一套标准的三层架构：

### ① `lang/action.yml` (底层动作 / 发动机)
* **角色**：这是一个 **Custom Composite Action (自定义复合动作)**。
* **职责**：它是核心引擎。负责接收配置并运行 `lang_v2.js` 脚本来执行具体的 HTML 处理与 Sitemap 拆分任务。
* **特点**：对外完全黑盒，无论上层逻辑怎么变，它只管处理文件。

### ② `.github/workflows/lang-deploy.yml` (复用工作流 / 生产流水线)
* **角色**：这是一个 **Reusable Workflow (可复用工作流)**。
* **职责**：这是一条固化的标准部署流水线。它编排了：拉取代码 -> 调用“发动机”编译 -> 发布到 GitHub Pages 这一整套连贯动作。
* **优势**：如果有十个不同的项目要部署，它们只需要“订阅”这条流水线，而不用把几十行构建代码复制十遍。

### ③ `.github/workflows/lang-deploy.yml` (位于用户项目的调用者 / 启动按钮)
* **角色**：这是一个 **Caller Workflow (调用者工作流)**（对应 `lang/deploy-example.yml`）。
* **职责**：作为用户的启动触发器。里面只有一行核心代码 `uses: doc2401/actions/.github/workflows/lang-deploy.yml@main`。
* **优势**：用户的仓库极其干净。以后只要我们在 `actions` 仓库升级了底层逻辑（例如更换 Node 版本或优化拆分算法），所有按了“启动按钮”的项目下一次部署时就会**自动享受最新功能**，全程无需改动代码！
