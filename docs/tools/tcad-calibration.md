---
title: TCAD 模型校准
slug: tcad-calibration
status: stable
version: 3.1.4
owner: 王工
group: 建模
kind: gui
tags: [Sentaurus, Silvaco]
updated: 2026-08-12
---

# TCAD 模型校准

> 导入实测 IV/CV 曲线，自动优化 TCAD 模型参数并生成校准报告。

## 安装

\`\`\`bash
# 部门镜像
pip install aipower-tcad-cal --index-url https://pypi.local/simple
\`\`\`

## 快速使用

\`\`\`python
from aipower.tcad_cal import Calibrator

cal = Calibrator(
    tool='sentaurus',           # 或 'silvaco'
    measured='./data/iv_25c.csv',
    target='./data/cv_25c.csv',
)
report = cal.run(
    params=['N_doping', 'N_epi', 'oxide_thickness'],
    n_iter=50,
)
report.save_html('./output/cal_report.html')
\`\`\`

## 校准策略

支持 3 种自动调参策略：

| 策略 | 适用场景 | 单次耗时 |
|---|---|---|
| LHS + 回归 | 全局探索 | ~2h |
| 贝叶斯优化 | 中等维度（5-10 参数） | ~30min |
| CMA-ES | 高维非线性 | ~1h |

## 变更日志

- **v3.1.4** (2026-08-12) 修复 Silvaco 路径解析 BUG
- **v3.1.0** (2026-07-20) 新增 CMA-ES 策略
- **v3.0.0** (2026-06-15) 重构参数 Schema，支持自定义
