---
title: MOSFET FoM 计算器
slug: mosfet-fom-calculator
status: stable
version: 1.3.0
owner: 张工
group: 规格
kind: web
tags: [Si MOSFET, SiC MOSFET, IGBT]
updated: 2026-08-21
---

# MOSFET FoM 计算器

> 计算 Si / SiC MOSFET 的 Baliga FoM 与 Ron,sp 多电压档对照，支持自定义工艺节点。

## 一句话

把 datasheet 上的 Ron、Qg、Ciss 三个数丢进去，自动算出 FoM 和 Ron,sp，并跨电压档对照。

## 安装

打开下方 Web 工具即可，**无需安装**。

[▶ 打开 Web 工具](https://aipower.local/fom)

## 快速使用

```bash
# CLI 版本（可选）
pip install aipower-mosfet-fom

aipower-fom calc \
  --vd 650 --ron 0.085 --qg 35n \
  --tech sic --node "Trench-1200V"
```

## 原理与公式

### Baliga FoM

\`\`\`
FOM_B = (R_on,sp × E_oss)  [单位: mΩ·cm² · μJ/cm²]
\`\`\`

### Ron,sp

\`\`\`
R_on,sp = R_on,DS × A_cell  [单位: mΩ·cm²]
\`\`\`

## 变更日志

- **v1.3.0** (2026-08-21) 新增 1200V 档位
- **v1.2.0** (2026-07-14) 性能优化，支持自定义工艺节点
- **v1.1.0** (2026-06-02) 新增 IGBT FoM 计算
- **v1.0.0** (2026-05-10) 首个稳定版本

## 反馈

有问题找 **张工**（内网 IM: zhang_gong）。
