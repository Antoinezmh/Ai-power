# AIxPOWER 2.0 V1 — 开发蓝图与闭环参考实现

日期：2026-09-30。定位：From Engineering Question to Engineering Decision。

这不是生产系统，也不是已接通 TCAD 的网站。包内含完整 V1 蓝图、PostgreSQL 建表草案、Task/Skill/Tool 合同、提示词、Next.js/FastAPI 边界设计，以及用 Python 标准库和 SQLite 实现的可运行闭环。所有案例数据均为演示数据，无真实 G3 试验结论。

## 运行

需要 Python 3.10 或以上；不需要第三方依赖。

```bash
python -m unittest discover -s tests -v
python -m backend.demo
```

demo 使用临时 SQLite 文件，运行后删除；`backend.engine.Engine(path)` 可使用指定文件持久保存。输出是调查假设评分、验证实验提案与审批状态。它不会执行 TCAD、工艺配方、投片、掩膜发布或量产动作。

## 阅读顺序

1. `docs/BLUEPRINT.md`：范围、模块、状态、证据、审批、前后端及开发顺序。
2. `contracts/schema.sql`：PostgreSQL 目标模型，尚未执行迁移验证。
3. `contracts/task.example.json`、`skills/htrb_rca.v1.json`、`contracts/tool.example.json`。
4. `backend/engine.py`、`backend/demo.py`、`tests/test_engine.py`。
5. `prompts/chief-engineer.md`：模型职责和输出约束。

## 已实现 / 设计待实现

| 内容 | 状态 |
|---|---|
| Task 持久化、假设、证据链接、可解释评分 | 本地参考实现 |
| 决策绑定任务修订版本、双人职责分离审批、消费审批检查 | 本地参考实现 |
| 修改任务后旧决策与审批失效、缺失证据阻断、审计事件 | 本地参考实现 |
| PostgreSQL / FastAPI / Next.js / 身份认证 / 项目隔离 | 蓝图及合同，未实现 |
| 持久化任务队列、worker 恢复、对象存储、工具沙箱 | 蓝图，未实现 |
| TCAD / SPICE / MATLAB / 内部数据库 / LLM | 接口合同，未接入 |
| 工程概率校准、规则审批、组织记忆 | 蓝图，未实现 |

审批参考实现接受测试 actor 字符串，不具备真实身份认证；不能连接生产设备。审计表也不是防管理员篡改的生产审计系统。

## AIxPOWER-Judge v0.1

`docs/JUDGE-v0.1.md` 包含官方核验、本地部署、三种模板、规则/模型/人审融合和 benchmark 格式。

```bash
python -m backend.benchmark
```

`backend/judge.py` 包含可测的规则与融合逻辑以及可选 LocalLaya SDK 适配器；`backend/judge_api.py` 是未集成测试的 FastAPI 端点。本次没有下载权重或运行 Laya，模型推理默认关闭。benchmark 只有合成合同样例。
