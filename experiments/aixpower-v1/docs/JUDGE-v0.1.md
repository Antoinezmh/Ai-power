# AIxPOWER-Judge v0.1 — Shadow Engineering Reflex Engine

日期：2026-09-30。状态：规则与融合逻辑已测试；本地 Laya 适配代码与 FastAPI 端点未做真实模型集成测试。

## 官方资料核验

上游提供 choice / score / noul、Python SDK、本地 HTTP 服务，模型卡标注 Apache 2.0。英文 checkpoint 约 421M，另有多语言和 typed-decisions checkpoint，不应把全部配置视为同一模型。typed-decisions 针对四类合成业务工作流，模型卡说明与 Jev 的比较不是同条件重测；基础模型还有 noul 标签偏置等局限。

仓库说明 Laya choice/score 的 confidence 使用归一化熵，与 Jev 定义不同，阈值不能迁移。以上不证明 SiC 泛化或概率校准。

来源（本次已读取）：

- https://github.com/NandhaKishorM/laya
- https://huggingface.co/convaiinnovations/laya
- https://huggingface.co/convaiinnovations/laya-typed-decisions
- https://docs.typesafe.ai/introduction

生产实验需固定源码 commit、包版本、权重 revision/sha256，分别审阅代码和模型许可证。不沿用未经复现的毫秒延迟和准确率宣传。

## 融合规则

State 验证 → Rule Engine → Laya 旁路建议 → LLM 独立证据审阅 → 服务端 Policy Gate → 人审 → 已授权工具。

硬规则 FAIL 不能由模型投票覆盖；缺数据或测试条件不匹配为 UNKNOWN；PASS 只表示已配置约束通过，不证明可靠性。V0.1 所有结果 auto_execute=false。Laya 只能建议调查方向、审阅优先级和升级；LLM 允许反对其判断，不能仅为已选标签补理由。冲突时升级，不让模型修改阈值。

未来自动继续只适用于已验证、低影响、可回滚且已授权动作。高置信度不能授权工艺、投片或量产。

## State 与三种模板

见 `contracts/engineering-state.schema.json`、`backend/judge.py` 和 benchmark 示例。

State 包含 Project、Task revision、带证据引用的观测、带单位/条件的指标、带 rule_version 的规格、关键缺失及拟议动作。规格来自团队正式批准的数据；演示中的 900 V 等阈值不是 G3 指标建议。

| 类型 | 模板 | 含义 |
|---|---|---|
| choice | 下一步优先调查方向，包含信息不足/其他 | 候选优先级，不是已确认根因概率 |
| score | 审阅紧急程度：routine / prompt / urgent | 序数等级期望，不是成熟度百分比 |
| noul | 是否升级；每个 Skill 是否需要参与 | 独立单项判断，不要求各 Skill 总和为 1 |

单个 choice 是互斥分布；不能用它同时产生 Reliability 0.91、TCAD 0.83、Design 0.78。多 Skill 路由逐项 noul 或二项 choice，再由 Orchestrator 检查依赖、数据、预算和权限。

模型输出要验证类型、有限数值、选项范围与概率分布；窗口截断、格式错误、超时或 OOD 应标 UNAVAILABLE，退回规则与专家。当前旁路代码保存原始结果但不消费它做权限判断；正式 UI 接入前补齐输出验证。

## 本地部署与服务

本次没有对用户服务器安装或部署。上游命令 `python -m pip install laya` 仅作为接口验证后的安装起点，实际环境应锁版本。包中 `backend/judge_api.py` 另需 FastAPI/Uvicorn。

1. 在独立虚拟环境安装审阅后的固定版本。
2. 从官方 Hugging Face 选择明确 checkpoint，完整下载配置、分词器、权重；记录 revision 与 sha256。
3. 本包 `LocalLaya` 用 `laya.load(local_directory)`，要求 `rl_agent_config.json`。不由 wrapper 自动选择远程 checkpoint。离线运行仍需完整缓存与网络策略验证，不能仅凭本地权重承诺零外传。
4. 默认不开启模型。设置 AIXPOWER_LAYA_ENABLED=1 与 AIXPOWER_LAYA_PATH=<审阅过的本地目录> 才加载。
5. AIXPOWER_JUDGE_API_KEY 通过环境配置，不提交 Git；请求使用 Bearer。只在隔离本地服务：

```bash
uvicorn backend.judge_api:app --host 127.0.0.1 --port 8010
```

上游也提供 `laya[serve]` 与 `/v1/systemone`；本包使用 SDK 适配。英文结构化输入、多语言输入与 typed-decisions 作为不同实验组，不默认任一 checkpoint 更适合 SiC。

当前环境没有 FastAPI、Laya 或模型权重，因此未测 GPU 延迟、吞吐、模型准确率和服务启动。端点仅有测试共享密钥，未实现用户身份/项目 ACL，不能服务真实保密项目；上线还需完整 JSON Schema 验证、请求限流、受控 worker、预热、审计和健康检查。手写 State 校验不替代完整 schema 或证据真实性检查。

## G3 HTRB benchmark

`benchmarks/htrb-format.example.jsonl` 仅有 2 条合成合同样例；`python -m backend.benchmark` 检查规则行为，不测模型准确率。

真实格式要求 case_id、当时可见的 state、问题/模板版本、lot/time/process split_group、专家标签、确认时间、模型版本/权重哈希、分布、延迟和 abstain。

三个任务分别标注：应调用的 Skill（多标签）、是否升级、后续确认的机理（可多机理/未确认）。历史 release/no-release 不等于物理真理，应保留后续结果、撤回与专家分歧。

防泄漏：同 lot、DOE、失效批及其报告衍生品不能跨训练/测试；训练、校准、最终测试分开，按时间及工艺版本留出。输入不能含后续 FA 结论；记录 gold_available_at。G2 → G3 作为迁移实验，不默认跨代成立。

对照组：规则/简单路由、通用 LLM、未微调 Laya、工程微调 Laya。指标：多标签路由 recall/无用调用成本、关键升级漏检、选择性风险/覆盖率、分任务与语言的 Brier/ECE、换序/改标签/否定重述稳定性、缺条件与新工艺 OOD、冷/热 p50/p95 完整请求延迟、硬约束绕过率（必须零）。不设置未经验证的 0.8/0.9 自动执行门槛。

先证明相比简单 baseline 的增益，再微调 Power-Laya。若没有增益，保留接口而不让架构依赖该模型。组织资产来自有结果反馈、可追溯的高质量工程标签。
