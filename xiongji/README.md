# 熊记 · 手账拼贴风记账 App

手账拼贴风格的记账 PWA。离线可用，数据存在本机 + 你自己的 GitHub 私有仓库。

线上地址：https://reotho123-pixel.github.io/lazy-ledger/xiongji/

---

## 文件结构

```
index.html          单文件应用（HTML + CSS + JS 全在里面）
manifest.json       PWA 清单
sw.js               Service Worker（离线缓存）
icons/              应用图标
assets/bear/        64 张自嘲熊贴纸（透明底 PNG，已填成实心白身）
assets/fonts/       站酷快乐体（93 个 woff2 子集，本地打包，离线可用）
```

---

## 设计规范

配色全部从参考图采样，**改色请同步 `index.html` 顶部的注释块**。

| 用途 | 色值 |
|---|---|
| 页面底（薄荷蓝 + 白波点） | `#B5DEE6` |
| 卡片纸 | `#FFFFFF` |
| 虚线描边 | `#9CCBD9` / 浅 `#CFE8EF` |
| 正文 | `#5A7C8C`，次要 `#8AA5B2` |
| 主粉 | `#F58BA8` |
| 浅粉 | `#FFE3EA` |
| 深粉字（浅粉底上） | `#D9557A` |
| 淡蓝底 | `#E8F6F8` |

**粉色深浅搭配规则**：浅粉底配深粉字（支出按钮、选中的分类）；深粉底配白字（发送箭头）。
**收入一律走淡蓝**，跟支出的粉形成对照。

### 几个不能改的地方（都有原因）

1. **内容区顶部内边距**（`main` 的 `padding-top:14px`、`#page-record .feed` 的 `padding-top:12px`）
   卡片上的胶带是 `top:-11px` 探出卡外的，而这两个容器是 `overflow-y:auto`，
   **内边距改成 0 会把胶带上半截裁掉**，看起来就只剩一个折出去的三角。

2. **层级表**（写在 CSS 顶部注释里）
   `10` 内容 → `40` 任务栏 → `60/61` 月份面板 → `80/81` 弹层 → `90` 确认层 → `95` toast。
   新增覆盖层时按这个顺序排，别低于 60。

3. **`<html data-page="…">`**
   JS 切换页面时会写这个属性，CSS 靠它区分页面级装饰
   （比如页头那只熊在账本/统计页要隐藏，否则和卡片上的大熊挤在一起）。

4. **localStorage key = `xiongji-v1`**
   沿用旧版 key，老用户的本机账目能无缝继承。换 key 等于数据凭空消失。

---

## 数据与同步

- 数据结构：`{ records:{id:rec}, budget, cats, cfg }`
- 同步机制：一笔一个 JSON 文件推到 GitHub 私有仓库，**只增不改名**，规避 read-modify-write 冲突
- 读用 Contents API（私有仓库用 raw 域名会匿名 404、带 token 被 CORS 拦）
- 删除是本机先删、同步时再删云端（`pendingDeletes` 队列）
- 需要 fine-grained token，只授权那个仓库的 Contents 读写

---

## 贴纸素材

64 张，全部**实心白身**。这一点很重要：

素材原图是「白底上画的白熊」，抠图时如果按白色去背，**熊的身体和背景同色会被一起抠掉**，
只剩深色描边。放在白卡上看不出来，一放到蓝墙上就穿帮（墙色从身体透过来）。

处理办法是给熊填一个不透明白身：
把描边向外膨胀几像素补上断口 → 从四边泛洪出「外部」→ 泛洪进不去且非描边的像素就是身体内部 → 填不透明白色。
边缘半透明像素保留原色、只把 alpha 提到 255，这样描边依旧柔和。
顺带效果是熊外面自然多一圈白边，像剪下来的实体贴纸。

贴纸按用途命名：`cat-*` 类目（11）/ `hero-*` 主角（20）/ `tab-*` 导航（4）/
`mark-*` 小贴纸 / `aut-*` 季节 / `misc-*` 道具。

---

## 本地预览

```powershell
powershell -File tools\server.ps1 -Root <本目录绝对路径> -Port 8860
```

然后浏览器打开 `http://127.0.0.1:8860/`。
**必须走 http，不能直接双击 index.html** —— Service Worker 和 localStorage 在 file:// 下不工作。

---

## 部署

双击 `tools\deploy-now.bat`，按提示粘贴 GitHub token（输入时不显示，只在内存里用、不落盘）。

部署目标：`reotho123-pixel/lazy-ledger` 仓库的 `xiongji/` 子目录。

**改了内容记得把 `sw.js` 里的 `CACHE` 版本号 +1**，否则用户会一直跑旧版。
