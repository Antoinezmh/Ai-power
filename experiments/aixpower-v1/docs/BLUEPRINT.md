# AIxPOWER 2.0 V1 软件蓝图

本文件是建议冻结的开发基线，待团队确认后成为正式基线。用户提供的 Pine 产品描述作为设计背景，不作为本文件独立验证的产品事实。示例数值均不代表 G3 的真实结果。

## 1. V1 目标与边界

Golden Project：G3 / 750 V / 8-inch；首个用例为 HTRB 异常调查。唯一验收目标是：工程师建立一个问题，导入可追溯证据，运行一个版本化 RCA Skill，得到可审查的假设排序和下一步验证计划，经人工审批形成有版本的工程记录。

V1 不自动判定量产放行，不执行真实工艺配方，不让模型自动发布团队规则，不训练领域大模型。Chief Engineer 是任务协调器，不能代替责任工程师签署结论。一个入口，多种受合同约束的能力。

冻结六个基础对象：Task、Capability（Skill/Tool）、Evidence、State、Decision、Artifact。Project 负责隔离；Run 负责执行；Rule 负责可审批的学习。

## 2. 十个模块，一套模块化单体

| 模块 | 责任 | V1 持久对象 / 合同 |
|---|---|---|
| Chief Engineer Orchestrator | 澄清目标、拆任务、选择技能、汇总 | 结构化 PlanProposal，不直接变更审批 |
| Task Engine | 状态、依赖、修订、重试、暂停、恢复 | tasks、task_dependencies、events、outbox |
| Skill Registry | 版本化输入输出、前置条件、步骤和验收 | skill_versions，先 Git 评审后登记 |
| Tool Gateway | 白名单适配、权限、预算、作业状态 | tool_versions、tool_runs |
| Evidence Engine | 原始来源、假设关联、独立性、可解释评分 | evidence、hypotheses、evidence_links |
| Engineering Memory | 检索文档/项目、候选规则、专家审核 | rules、retrieval_snapshots |
| Engineering Judge | 确定性检查优先，模型做有引证的补充评审 | decisions，判定允许 UNKNOWN |
| Human Approval / Audit | 服务端鉴权、职责分离、版本绑定 | approvals、audit_events |
| Artifact Engine | 内容哈希、存储、版本、来源链 | artifacts，文件字节放对象存储 |
| Project Workspace | 问题、证据、时间线、审批和接管界面 | API projections，界面不作为授权边界 |

建议部署形态：Next.js 前端 + FastAPI API + Python worker + PostgreSQL + 内部对象存储。它们是本项目的设计选择，部署时另行锁定依赖版本。任务调度在 V1 使用数据库 outbox 与 worker，不先引入分布式多 Agent 服务、图数据库或复杂消息总线。

关系型表先承载 Evidence Graph；图查询是投影。向量检索只用于找到候选资料，不决定证据真假。

## 3. 数据模型

主表和字段见 `contracts/schema.sql`。几个不能省略的关系：

- Task 属于 Project，允许 parent_task，依赖必须同项目且无环。
- 每条 Evidence 指向不可变 Artifact；link 表表达 supports / contradicts / neutral / unknown。
- Evidence 同时记录来源家族 dependency_group；同一数据经图表、PPT、报告重复描述仍是同一组。
- Decision 固定 task_revision、输入哈希、Skill/Tool/Rule 版本、证据快照及计算结果。
- Approval 固定 decision_id、snapshot_hash、审批角色和有效期。新的输入、提案或运行参数产生新修订，旧审批不可沿用。
- Artifact 对象路径、哈希、原始量纲、工艺/测试条件和 Run 来源必须可回查。
- 工程身份：lot / wafer / die / DOE / split / device_revision / process_revision。V1 可放 JSONB，稳定后按查询需求规范化。

所有写入由 API 获取已认证 principal 并检查 project membership，不能从请求中的 actor、role 或 project_id 直接信任权限。RLS 是纵深防护，不替代 API 检查。生产 Schema 草案还需补充 RLS、跨项目复合外键、迁移和索引验证。

## 4. Task 合同与状态机

Task JSON 见 `contracts/task.example.json`。任务同时有研究状态与工具状态，不能把“worker 已完成”当作“机理已确认”。

研究状态：DRAFT → READY → RUNNING → REVIEW_REQUIRED → APPROVAL_PENDING → COMPLETED；补证回到 READY；暂停为 PAUSED；不可恢复为 FAILED；取消为 CANCELLED。RUNNING 中等待外部工具时用子 Run 的 QUEUED / SUBMITTED / WAITING / SUCCEEDED / FAILED / UNKNOWN，不伪造实时进度。

COMPLETED 表示这轮工程任务产物已完成，不代表假设成立；Decision 可以是 INSUFFICIENT_EVIDENCE 或 TEST_REQUIRED。机理状态另设 UNASSESSED / PLAUSIBLE / VALIDATED / REFUTED，VALIDATED 必须满足团队事先定义的因果验证标准。

生产 Task Engine 必备：

1. 写入以 revision 做乐观锁；API 使用 If-Match 或 expected_revision。
2. 每个 Run 有 idempotency_key、输入哈希、attempt、deadline、预算及外部 job_id。
3. Task 变更与 outbox 入队同事务，worker 通过租约领取，心跳、超时回收、检查点恢复。
4. 仅对安全、幂等步骤重试。外部提交超时先查询 job_id，状态不明为 UNKNOWN，禁止直接重复提交。
5. 暂停阻止启动新步骤；正在运行的作业需适配器提供取消能力，否则显示“暂停请求中”。Take over 保留租约、责任人和恢复点。
6. 执行前再次验证版本、权限、预算及审批，防止审批后方案被修改。

本包 SQLite 参考实现只验证同步闭环，不实现上述异步 worker。

## 5. Evidence Graph 与评分

证据最小字段：来源定位（页/图/范围）、artifact_sha256、工艺和测试条件、单位、抽取版本、质量、有效性、dependency_group，以及支持或反驳哪个假设。LLM 的推测不是实验 Evidence。

必须区分：原始观测 → 数据推导 → 机理解释 → 下一步建议。仿真不是实测，相关性不是因果。未观察到 TEM 缺陷需写明抽样位置、检出能力与覆盖度；否则不能有效排除局域损伤。

原文示例中“烘烤恢复 + FLR 定位”可以引导下一轮测试，但不唯一识别终端机理，不能自动升为团队强因果规则。本 V1 不做真实 HTRB 机理判断。

### V1 可解释排序策略

候选策略 `evidence-score/v0-demo`（需要专家制定并验证后才能用于研发）：单条有效观测 v = polarity × quality × relevance，其中 polarity 为 +1 / -1 / 0。每个 dependency_group 分别取最大正支持和最大反证绝对值，再求和；组内冲突仍保留并触发人工检查。合计 clip 到 [-1,1]，作为排序指标。

输出同时展示支持数量、反证数量、未知、独立组、关键缺失、样本条件及策略版本。不输出 76% 机理概率。高分也可能有关键缺失，不能自动通过 Judge。

若未来需要概率，应先定义标签（哪种机理、哪个结局、何时确认），独立专家标注、处理选择偏差，按 lot/时间划分训练与验证，评估校准和错误决策代价；未通过这些步骤不得将评分映射为概率。

### Judge 的三态输出

PASS：允许进入下一人审环节；FAIL：明确违反合同/阈值；UNKNOWN：缺失或冲突足以影响结论。任一结论必须附 evidence_id；关键证据缺失时必须 abstain。

V1 允许输出“需要补证，批准收集温变漏电数据”，但不允许输出“证据不足，批准工艺放行”。阈值来自版本化评审规则，不能由模型现场编造。

## 6. Skill 注册

见 `skills/htrb_rca.v1.json`。Skill 是带验收标准的可运行流程，不只是 Prompt：id/version、input_schema/output_schema、steps、tool allowlist、required_evidence、limits、rule_versions、risk_level、review_owner、evaluation_set、release_state。

注册流程：草稿 → 测试集 → 专家评审 → APPROVED → 固定版本；已发布版本不可覆盖。修改生成新版本。Run 记录输入、输出、工具版本和规则快照。组织学习只生成 candidate rule，经责任专家确认适用条件、反例、有效期后发布；不允许模型自批。

首批仅做 3 个：数据摄取与条件检查、Wafer Map 描述统计、HTRB 假设与补证计划。之后再扩展 TCAD 电场审阅和 DOE 分析。原列 20 个作为路线图，避免全部浅实现。

评估集包括：缺温度/单位、烘烤前后条件不同、报告重复引用同一晶圆、证据冲突、空数据、跨项目检索、被撤回数据、未知工具状态。

## 7. Tool / MCP Gateway

统一内部协议见 `contracts/tool.example.json`。适配器提供 describe/validate/submit/status/result/cancel；优先 API、批处理 CLI 或受控脚本，最后才 GUI。无 API 的 GUI 动作同样记录参数、截图、软件版本与人工接管。

工具“有权限”不等于本次“有审批”：检查工具白名单、项目权限、运行级风险、路径范围、网络和许可证配额。工具参数使用 schema，禁止模型提交任意 shell。只允许声明的输入 artifact 与工作目录，不读取任意个人目录。

风险等级在服务端计算：仿真虽然属于分析，也可能消耗大量许可证或算力；远程系统写入、保密材料外传、标定数据库更新不能被 CREATE 标签掩盖。Recipe / mask release / wafer start / qualification / MP 在 V1 统一禁用执行适配器，仅生成提案。

每个 Run 必须存 tool_version、参数、输入哈希、环境、返回码、job_id、输出 artifact hash。相同 idempotency_key 对不同输入应 409。

## 8. 权限、审批与审计

权限拆开：用户能做什么（role）、此动作影响什么（risk）、这次授权哪一版（approval）。人审不是前端按钮，而是服务端状态转换。

角色：viewer / engineer / reviewer / operator / admin。提出人不能审批自己的执行提案；admin 不默认有工艺签核资格。V1 可先支持 engineer 提案 + reviewer 审批，后续按质量体系扩展双签。

审批绑定：project、decision、task_revision、完整参数哈希、目标环境、证据快照、Skill/Tool/Rule 版本、审批人、时间、有效期、单次使用。拒绝、过期、撤回、方案修改均使其无效。Consume 与 Run 创建必须同事务；生产工具执行仍需在外部执行前再次校验。

审计采用 append-only 应用权限，敏感事件送独立受控存储，原始数据/审批记录保留策略与团队确定。日志哈希链不能阻止有数据库管理员权限的人重写整条链，不能宣传为绝对防篡改。

任务文档内容为不可信输入；不能让 PDF/PPT 内提示修改权限、触发工具或泄露凭据。密钥由服务端提供给适配器，模型上下文不含密钥。项目 ACL 先过滤，再检索。

## 9. 四层 Memory 的实现

M1 文档：artifact + chunks + 坐标 + 权限 + 抽取版本。
M2 项目：任务、DOE/lot/wafer/test/reliability、决策与反馈。
M3 工程：专家审批过的规则/skill/阈值，标注适用器件和条件。
M4 组织：review 模板、经验修订、失败方法；候选和已发布分开。

优先取同项目同器件同工艺版本的证据；跨代经验仅作为先验提醒，不能代替当前实测。结论保存 retrieval_snapshot，后续检索索引更新不改变历史决策。规则可撤回，系统列出受影响的历史决策并安排复审。

## 10. G3 HTRB Golden Case 的可跑通定义

输入包：至少包含样本身份、测试条件、定位材料、烘烤前后数据及条件、工艺修订；缺什么必须如实显示，不自动补数据。

H1 终端相关 / H2 沟槽栅氧相关 / H3 污染相关 / H4 界面相关 / H5 边缘工艺差异，仅作为调查分类。实际机理应结合数据进一步拆分，允许多机理共存。

流程：导入并验来源 → 建 Task → 确认假设 → 证据关联 → 去重复计权 → 生成解释性排序 → Judge 检查关键缺失 → 提出可区分假设的测量/DOE → 工程师修订 → 审批该版本 → 保存决策包 → 反馈归档。

演示成功标准：有支持但缺关键数据时输出 NEED_MORE_EVIDENCE；批准的是补证提案；新证据进入后旧审批失效；不出现确定性根因、虚构仿真结果或编造最优 P-shield 深度。

最终 Decision package 包括问题、条件、观测、假设、支持/反证/缺失、评分方法、建议实验、停止条件、责任人和审批版本。可导出 JSON / Markdown，后续再增加 PDF/PPT。

## 11. FastAPI 边界与端点

| 方法与路由 | 输入 / 行为 | 关键约束 |
|---|---|---|
| POST /v1/projects/{p}/tasks | TaskCreate → Task | membership，幂等键 |
| GET /v1/tasks/{id} | 聚合 Task view | 项目授权，返回 revision |
| POST /v1/tasks/{id}/evidence | EvidenceCreate | artifact 归属、条件、哈希、If-Match |
| POST /v1/tasks/{id}/runs | skill/version + input snapshot | 输入校验、预算、outbox 事务 |
| GET /v1/runs/{id} | Run + artifacts | 项目授权，不暴露凭据 |
| POST /v1/runs/{id}/pause | pause request | 确认外部状态后响应 |
| POST /v1/tasks/{id}/decisions | structured decision | evidence refs、固定 revision |
| POST /v1/decisions/{id}/approvals | approve/reject + reason | reviewer 身份、职责分离、有效期 |
| POST /v1/decisions/{id}/execute | 受控 action | V1 高风险适配器禁用，服务端审批检查 |
| GET /v1/tasks/{id}/events | SSE event stream | event_id 续传、ACL、心跳 |
| POST /v1/rules/candidates | retrospective proposal | 只存候选，不自动发布 |

推荐代码结构：api/routes、domain/tasks/evidence/decisions、services/orchestrator/judge、adapters/tools/storage/llm、workers、repositories、schemas、migrations。API 层不直接写任意 SQL 或调用 TCAD；domain 返回受类型约束的动作。

错误语义：403 权限，409 版本或幂等冲突，422 输入/单位不合法，预算不足返回业务错误，工具未知保留 UNKNOWN 状态。上传先分配对象 key，经哈希和类型校验后才进入可引用的 Evidence。

## 12. Next.js 重构

当前源代码未在本次工作区，因此这是目标结构，不是已修改原项目。

app/projects/[projectId]/tasks/[taskId]/page.tsx 仅组装以下组件：

- ProjectNavigator：项目与 Case，不把 Conversation 作为顶层目录。
- TaskHeader：目标、阶段、owner、revision、当前调查状态。
- EngineeringWorkspace：假设、执行计划、工具活动、结果与下一步。
- EvidencePanel：支持/反证/缺失、来源跳转、有效性和独立性。
- DecisionReview：观测和推断分区、版本固定、Approve/Reject/Request change。
- ActivityTimeline：Run、事件、检查点、失败与接管记录。
- ChatComposer：把自然语言转为 PlanProposal，工程师确认后写 Task。

白亮背景、有限毛玻璃用于导航；工程表格与证据正文保证对比度。便签适合待办，不承载数值证据。评分写“调查排序分”，不用概率进度条；避免视觉上过度确定。

Server state 来自 API；任务事件增量更新与重新取快照结合；前端不能自行生成成功、修改批准或跳过 revision 校验。证据源打开需要短期授权链接。

## 13. Prompt 合同

Chief Engineer 负责计划与解释；Skill Executor 只执行已发布 Skill；Judge 负责可验证门槛；Memory Curator 只提出候选规则。V1 可以共用模型，不要求四个独立常驻 Agent。

模型只能输出 JSON proposal，服务端 schema 和 rule engine 验证后才写入。模型不能给自己权限、创建有效审批或修改工具版本。系统 Prompt 不构成安全边界。

具体模板见 `prompts/chief-engineer.md`。保存 prompt_version、model_id、检索快照，但不要求保存模型隐藏推理；保存足够审计的理由和证据即可。

## 14. 实施顺序与验收

| 里程碑 | 交付 | 通过条件 |
|---|---|---|
| M0 数据基线 | G3 Case 数据字典、匿名化样例、权限矩阵 | 专家确认可用数据、目标与机理验证标准 |
| M1 Task + Evidence | PostgreSQL、对象存储、API、Case 页面 | 来源可回查、revision 冲突阻断、项目隔离 |
| M2 一条 Skill 闭环 | HTRB RCA、确定性 Judge、Decision | 缺证据会 abstain、重复来源不重复计权 |
| M3 工具执行 | 先 Python/WaferMap，再一个 TCAD 适配器 | 版本/预算/许可证可控、崩溃恢复、无重复提交 |
| M4 审批与记忆 | 绑定版本审批、候选规则、审计导出 | 自批/越权/过期/变更均阻断，规则经专家签核 |
| M5 真实 Golden Project | 在 G3 一轮调查中旁路运行 | 专家比较有无系统的结果质量与耗时，记录失败 |

不承诺未评估工时。每个里程碑有可审核输出，先完成一条真实闭环再扩充 20 个 Skill。

V1 评估指标：可追溯结论比例、未授权执行次数（必须零）、关键缺失检出、专家推翻率、重复计权率、任务恢复成功率、证据整理耗时、工程师采用率。模型语言流畅度不是主要指标。

## 15. 当前包的技术债与上线阻断项

本地核心测试覆盖持久化、相关证据去重、审批失效、职责分离及未知数据。不等于完整系统安全认证。SQLite actor 为测试身份；真实身份、跨项目 ACL、RLS、外部动作幂等、对象字节校验、队列恢复、权限审计导出和 PostgreSQL 迁移都尚未完成。

因此本包用于蓝图评审和实现启动。它已把产品方向落到数据、合同和可运行行为，但不能直接接生产设备或宣称自主研发。
