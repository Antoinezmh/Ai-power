---
title: 研发流程
aside: true
---

# 研发流程

> 7 个阶段 · 14 个 Gate · 各阶段挂载相关工具

从规格到量产，本部门研发流程划分为 7 个阶段（G0–G6），每个阶段包含若干 **Gate**（准出条件）。点击任一阶段可查看该阶段挂载的工具。

<PipelineFlow />

## 当前聚焦：G1 建模

建模阶段的典型流程：

1. 使用 TCAD 工具构建器件结构
2. 导入实测 IV/CV 曲线进行**模型校准**
3. 提取 **SPICE 子电路**模型，含 corner / Monte Carlo
4. 版图完成后做**寄生参数**提取（DPF / SPEF）

### 准出条件 Checklist

- [x] TCAD 模型通过校准
- [x] SPICE subckt 已发布
- [ ] 寄生提取报告完成
- [ ] 完整 corner 模型归档

### 相关工具

- [TCAD 模型校准](/tools/tcad-calibration)
- [SPICE 子电路提取](/tools/spice-subckt-extract)
- [寄生参数提取](/tools/parasitic-extraction)

---

## 各阶段工具数量

| 阶段 | Gate | 工具数 | 工具链接 |
|---|---|---|---|
| G0 规格 | 参数冻结 | 3 | [查看](/tools/?group=%E8%A7%84%E6%A0%BC) |
| G1 建模 | 模型签核 | 3 | [查看](/tools/?group=%E5%BB%BA%E6%A8%A1) |
| G2 版图 | DRC/LVS 0 error | 1 | [查看](/tools/?group=%E7%89%88%E5%9B%BE) |
| G3 工艺 | 流片参数冻结 | — | （暂无） |
| G4 测试 | 全 ATE Pass | 4 | [查看](/tools/?tools/?group=%E6%B5%8B%E8%AF%95) |
| G5 可靠性 | HTOL Pass | 2 | [查看](/tools/?group=%E5%8F%AF%E9%9D%A0%E6%80%A7) |
| G6 量产 | SPC Cpk ≥ 1.33 | — | （暂无） |

> 注：G3 / G6 暂未挂载工具，可由后续工程师补齐。
