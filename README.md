# 共享多语言内容部署 Actions

本仓库提供了可复用的 GitHub Actions 工作流，用于构建多语言静态页面并生成 `sitemap.xml` 文件。

通过本共享工作流，其他项目只需要在根目录下维护一个 `lang.json` 配置文件，并直接下载/引入本仓库的部署工作流即可。

---

## 1. 配置项目参数 (lang.json)

请确保您的项目**根目录**下存在一个 `lang.json` 配置文件。示例如下：

```json
{
  "pages": [
    {
      "url_comment": "访问的 url",
      "url": "en/",
      "path_comment": "合并的目录列表",
      "path": [
        "00-nohtml/",
        "00-html/"
      ]
    },
    {
      "url": "zh/",
      "path": [
        "00-nohtml/",
        "02-html.qwen_qwen3.5-9b.202604150704/"
      ]
    }
  ]
}
```

---

## 2. 快速安装部署工作流

您无需手动复制粘贴配置内容。请在您的项目根目录下打开终端，并运行以下命令，即可直接下载并生成工作流文件：

### Linux / macOS / Git Bash
```bash
mkdir -p .github/workflows && curl -fsSL https://raw.githubusercontent.com/doc2401/actions/main/lang/deploy-example.yml -o .github/workflows/deploy.yml
```

### PowerShell
```powershell
New-Item -ItemType Directory -Force -Path .github/workflows; Invoke-WebRequest -Uri "https://raw.githubusercontent.com/doc2401/actions/main/lang/deploy-example.yml" -OutFile ".github/workflows/deploy.yml"
```

---

## 3. 推送并运行

完成上述两步后，直接将 `.github/workflows/deploy.yml` 和 `lang.json` 提交并推送到您的 `lang` 分支：

```bash
git add lang.json .github/workflows/deploy.yml
git commit -m "chore: add pages deploy workflow"
git push origin lang
```

GitHub Actions 将会自动开始执行多语言页面的构建与部署。
