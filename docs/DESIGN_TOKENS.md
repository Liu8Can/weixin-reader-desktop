# 设计规范：品牌色与色阶

> 现行规则：新增或修改应用窗口页面 UI 时必读。品牌色是产品视觉记忆的一部分，改动需谨慎。

## 品牌色

艾特阅读的品牌主色为 **`#349f66`**（HSL 148, 51%, 41%）。

出处（最早载体，即品牌色的权威来源）：

- 应用图标 `src-tauri/icons/`（绿底白 @ 图案）
- `title.svg` 标题图（内嵌 PNG 调色板仅黑、白、`#349f66` 三色）
- 阅读进度条 `src/scripts/managers/turner/progress_bar.ts`

2026-09 之前，各窗口页面历史上各自选色（Google 蓝、`#4a90e2` 蓝、薄荷绿、teal 青绿等），从未对齐品牌绿；2026-09 起全部统一到下述色阶。

## 色阶表

### 亮色模式

| Token | 色值 | 用途 | 备注 |
|---|---|---|---|
| `--accent` | `#349f66` | 主强调色：主按钮、激活态、品牌图形 | 对白底对比 3.33:1，仅用于图形/大字号，不作小字文字色 |
| `--accent-hover` / 链接 | `#297f51` | hover 深一档；白底小字链接 | 对白底 4.89:1，达 WCAG AA |
| `--accent-soft` | `#e6f5ed` | 品牌浅底：激活项背景、图标容器底 | |
| `--accent-button` | `#297f51` | **primary 按钮背景（明暗同值）** | 白字 4.89:1 达 AA；暗色下不用提亮绿做按钮底 |
| `--focus` | `rgba(52, 159, 102, .34)` | 焦点环 | |

### 暗色模式

| Token | 色值 | 用途 | 备注 |
|---|---|---|---|
| `--accent` | `#60c38e` | 主强调色（提亮版） | 对 `#202124` 底 7.43:1 |
| `--accent-hover` | `#7acda0` | hover 再亮一档 | |
| `--accent-soft` | `#223f2f` | 品牌深底 | |
| `--accent-button` | `#297f51` | **primary 按钮背景（明暗同值）** | 提亮绿 `#60c38e` 仅作暗底文字/图形/toggle，禁作按钮底色（白字对比仅 1.9:1） |
| `--focus` | `rgba(96, 195, 142, .38)` | 焦点环 | |

## 使用规则

1. **背景永远中性**：页面背景、面板、正文文字、边框使用灰黑白中性色系；品牌色只用于强调（按钮、激活态、链接、品牌图形、焦点环），不用于大面积背景。
2. **新页面必须引用色阶**：不得自造 accent 色值。单文件静态窗口（无共享 CSS）按本表取值定义各自的 `--accent` 等 CSS 变量。亮色窗口内 `--accent` 可按用途取档：图形/装饰用 `#349f66`，按钮/可读文字等需要对比度的场景用 `#297f51`（设置页采用后者）。
3. **primary 按钮背景明暗同值 `#297f51`**（`--accent-button`），白字对比 4.89:1；提亮绿 `#60c38e` 只用于暗底上的文字、图形、toggle、焦点环，禁止做按钮/色块底色叠白字（历史教训：暗色 primary 按钮曾用 `#60c38e` 底 + 白字，对比仅约 1.9:1，刺眼难读）。
4. **语义色不属于品牌色**：success / danger / warning 各页面保留现状（如 plugin-installer `#157347`、editor Google 四色、settings 琥珀/红），不随品牌色变动。
5. **官方同构 UI 例外**：微信读书、番茄等站点内"对齐官方采样值"的注入 UI（样式面板、弹窗等）不适用品牌色，遵循各自的官方同构规范。艾特阅读自有 UI（进度条、toast 等）才使用品牌色。
6. **编译产物不手改**：`inject.js`、`local_reader.js` 中的色值由 `src/` 源码构建生成。

## 旧 → 新替换映射（2026-09 统一记录）

| 旧色值 | 原用途 | 新色值 |
|---|---|---|
| `#65c4b8` | index / library / settings 暗 accent（teal） | 亮 `#349f66` / 暗 `#60c38e` |
| `#176b67` | settings 亮 accent（深 teal） | `#349f66` |
| `#d8eeea` / `#214642` | settings accent-soft | 亮 `#e6f5ed` / 暗 `#223f2f` |
| `#2f6fed` / `#245dcc` / `#78a7ff` / `#98bbff` | plugin-installer 蓝系 accent | 亮 `#349f66` / `#297f51`，暗 `#60c38e` / `#7acda0` |
| `#eef3ff` / `#e1e9fb` | plugin-installer 图标容器渐变（淡蓝） | `#edf7f1` / `#e0f1e8` |
| `#e7edfa` / `#5474ad` | plugin-installer 插件占位图标 SVG（淡蓝底/蓝紫图形） | `#e7f3ec` / `#349f66` |
| `#1a73e8` / `#8ab4f8` | privacy / terms / licenses 链接、editor active | 亮 `#297f51` / `#349f66`，暗 `#60c38e` |
| `#e8f0fe` / `#394457` | editor active-bg（淡蓝/蓝灰） | 亮 `#e6f5ed` / 暗 `#223f2f` |
| `#4d8262` / `#80b294` | 本地阅读器灰绿 accent（css 与 index.ts 内联） | 亮 `#349f66` / 暗 `#60c38e` |
| `rgba(101,196,184,…)` / `rgba(23,107,103,…)` / `rgba(47,111,237,…)` / `rgba(26,115,232,…)` | 各页品牌 rgba（focus/halo/阴影/flash） | `rgba(52,159,102,α)` / `rgba(96,195,142,α)`，α 取原值 |

## 全局对账

```bash
# 扫描全部窗口页面的彩色 hex（应只出现品牌绿阶与语义色）
python3 - <<'EOF'
import re, pathlib, collections
def sat(h):
    r,g,b = int(h[1:3],16), int(h[3:5],16), int(h[5:7],16)
    return max(r,g,b)-min(r,g,b)
for p in pathlib.Path('src/windows').glob('*.html'):
    for m in re.finditer(r'#[0-9a-fA-F]{6}\b', p.read_text()):
        h = m.group(0).lower()
        if sat(h) > 24:
            print(p, h)
EOF
```

品牌绿阶全集：`#349f66` `#297f51` `#e6f5ed` `#60c38e` `#7acda0` `#223f2f` `#edf7f1` `#e0f1e8` `#e7f3ec`（及其 rgba 形式）。出现其他彩色 hex 时，先对照本表判断是否语义色，否则视为偏离规范。
