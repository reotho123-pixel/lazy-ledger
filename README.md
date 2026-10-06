# 懒人记账 Lazy Ledger

iPhone 快捷指令自动记账 + 手动记账 + 统计的纯前端 PWA。参考 B 站视频
《iPhone懒人记账 自动记账 究极不掺水教程来啦》（BV1pg4y1e7oZ）的「快捷指令 → 飞书多维表格」方案，
把云端的飞书换成了 **你自己的 GitHub 仓库**：快捷指令通过 GitHub API 把每笔账写成一个 JSON 文件，
本应用从仓库读取并展示，离线也能正常使用。

**在线使用**：https://reotho123-pixel.github.io/lazy-ledger/

## 它是怎么工作的（对照飞书方案）

| B 站视频里的飞书方案 | 本应用 |
|---|---|
| 飞书多维表格 | 仓库 `data/` 目录，每笔账一个 `rec-*.json` |
| 飞书机器人 / 开放平台 API | GitHub Contents API（PUT/DELETE） |
| 飞书 App 里看账单 | 本 PWA（可加到 iPhone 主屏幕，离线可用） |

账单记录格式：

```json
{"id":"rec-20261006-183025-1234","type":"expense","amount":25.5,"category":"餐饮","note":"午饭","account":"微信支付","time":"2026-10-06 18:30","src":"shortcut"}
```

## 搭配 iPhone 快捷指令（自动记账）

### 第 0 步：创建 Token

1. 打开 https://github.com/settings/personal-access-tokens/new
2. 名称随意，过期时间选最长；**仓库访问 → 仅选择仓库 → lazy-ledger**
3. 权限：Repository permissions → **Contents → Read and write**
4. 生成并复制 token（经典 token 勾选 `repo` scope 也可以）

### 第 1 步：配置本应用

在网页 App「设置」页填入 GitHub 用户名 / 仓库名 / Token → 点「保存并测试连接」。

### 第 2 步：手动快速记账快捷指令

新建快捷指令，依次添加动作：

1. **询问输入**：提示"金额"，输入类型选数字
2. **从列表中选取**：`餐饮,交通,购物,日用,居住,娱乐,医疗,学习,人情,其他`
3. **格式化日期**（当前日期，自定义 `yyyy-MM-dd HH:mm`）→ 时间
4. **格式化日期**（当前日期，自定义 `yyyyMMdd-HHmmss`）→ 文件名
5. **文本**（把模板里的中文词替换成对应变量）：

   ```
   {"id":"rec-文件名","type":"expense","amount":金额,"category":"分类","note":"","account":"支付宝","time":"时间","src":"shortcut"}
   ```

6. **Base64 编码**：编码上一步文本
7. **获取 URL 内容**：
   - URL：`https://api.github.com/repos/你的用户名/lazy-ledger/contents/data/rec-文件名.json`
   - 方法 **PUT**；Headers：`Authorization: Bearer 你的Token`、`Accept: application/vnd.github+json`
   - 请求体（JSON）：`{"message":"ledger","content":"Base64结果"}`

### 第 3 步：自动化（支付成功自动上传）

1. 快捷指令 → 自动化 → ＋ → App → 选支付宝/微信 → 勾选"通知" → **立即运行、不询问**
2. 把第 2 步的"询问输入"换成**接收通知文本**，并用**匹配文本**提取金额：
   正则 `¥\s*([0-9]+(?:\.[0-9]+)?)`，取第 1 组作为金额
3. 微信部分通知不带金额：可在"支付成功"页面 分享 → 运行快捷指令；或把自动化设为"轻点背面两下"手动速记
4. 记完回到 App 点「立即同步」即可看到；App 也会自动同步

### 排查

- 401：token 错误；404：用户名/仓库名错误；403：权限不足（检查 Contents 权限）
- 快捷指令记录默认分类"其他"，可在 App 里点开记录修改

## 本地数据与隐私

- 所有数据保存在本机浏览器（localStorage）+ 你自己的 GitHub 仓库，没有任何第三方服务器
- Token 只存在本机浏览器，建议使用仅授权 `lazy-ledger` 一个仓库的 fine-grained token

## 本地开发

无 node/git 环境，用仓库内 `tools/server.ps1` 起 TCP 静态服务器（127.0.0.1:8765），
`tools/deploy.ps1` 通过 GitHub REST API 部署（token 从环境变量 `GH_TOKEN` 读取，绝不写盘）。
改动代码后记得把 `sw.js` 里的 `CACHE` 版本号 +1 再部署。
