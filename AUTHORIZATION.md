# Ai Power 权限与内部登录对接规范

## 结论

平台使用两层授权：

1. **RBAC（角色权限）**决定一个人能进入哪些模块、能否使用或管理工具。
2. **资源授权（空间权限）**决定一个人能访问哪一个资料空间或工具实例。

内部登录系统只提供可信身份和组织属性；Ai Power 后端把组织属性映射为本地角色，并以本地数据库中的权限为准。前端拿到的是已计算的权限码，用于展示菜单和按钮；任何写操作仍必须由后端再次校验。

## 角色分级

| 角色代码 | 显示名称 | 适用人员 | 核心权限 |
| --- | --- | --- | --- |
| `platform_admin` | 平台管理员 | 平台运维/部门授权管理员 | 用户、角色、权限、全部工具和全部资料 |
| `department_manager` | 部门负责人 | 研发负责人/平台主管 | 部门工具、分类、资料与流程协作；不分配平台角色 |
| `tool_owner` | 工具负责人 | 工具开发者、工具维护人 | 发布和维护工具、维护其资料协作空间 |
| `engineer` | 研发工程师 | 默认部门成员 | 使用工具、AI、在获授权资料空间读写 |
| `viewer` | 只读协作者 | 评审、外部协作或临时成员 | 查看获授权模块、工具和资料 |

工具或资料的实际范围不写进角色。例如“研发工程师”只获得“可使用工具、可上传资料”的能力；其能访问哪一个工具、哪个资料空间，由工具授权和文件空间的 `read` / `write` / `manage` 授权决定。

## 权限码约定

权限码是唯一的跨系统契约，使用 `类型:资源:动作` 形式：

```text
menu:tools
button:tools:view
button:tools:use
button:tools:manage
button:files:upload
button:permissions:manageUsers
```

完整目录和每个角色的默认组合定义在 `backend/app/core/access_control.py`。服务启动时会只创建缺失的权限、角色和默认授权，不覆盖管理员后续的手动调整。

## 内部统一登录接口

推荐 OAuth 2.0 / OpenID Connect 的授权码模式：浏览器只跳转内部 IdP；`client_secret` 和令牌交换只在 Ai Power 后端进行。

```text
浏览器 → 内部 IdP 登录 → redirect 到 Ai Power /login?code=...&state=...
前端 POST /api/v1/auth/sso/callback { "code": "...", "state": "..." }
Ai Power 后端 → IdP token endpoint / userinfo endpoint
Ai Power 后端 → 映射本地用户、角色、发放自己的 access_token / refresh_token
前端 GET /api/v1/auth/me → 用户资料、角色 ID、有效 permissions
```

Ai Power 后端从 IdP 至少需要如下可信字段（名称可通过适配器转换）：

```json
{
  "sub": "employee-001234",
  "username": "zhangsan",
  "email": "zhangsan@company.com",
  "name": "张三",
  "department_code": "POWER_RD",
  "groups": ["POWER_RD", "AIPOWER_ENGINEER"]
}
```

角色映射应由后端配置维护，示例：

```json
{
  "AIPOWER_ADMIN": "platform_admin",
  "POWER_RD_MANAGER": "department_manager",
  "AIPOWER_TOOL_OWNER": "tool_owner",
  "POWER_RD": "engineer"
}
```

未知用户或不在允许部门的用户应拒绝登录（`403`），而不是给默认权限。一个用户可映射多个角色，最终权限取并集。紧急或个别资料访问应通过 Ai Power 的资源授权界面配置，而非修改 IdP 全局组织架构。

## 接口返回约定

`POST /api/v1/auth/sso/callback` 与本地登录都返回平台自身 JWT：

```json
{
  "access_token": "<Ai Power JWT>",
  "refresh_token": "<Ai Power refresh token>",
  "token_type": "bearer"
}
```

`GET /api/v1/auth/me` 是前端唯一的授权引导接口：

```json
{
  "id": "local-user-id",
  "username": "zhangsan",
  "email": "zhangsan@company.com",
  "full_name": "张三",
  "roles": ["local-role-id"],
  "permissions": [
    "menu:dashboard",
    "button:dashboard:view",
    "menu:tools",
    "button:tools:use"
  ],
  "is_superuser": false
}
```

不要让前端根据 `roles` 自行推导权限，也不要相信浏览器缓存的 `permissions` 来授权 API。它们仅用于界面显示；后端每个敏感接口都应按本地用户和权限码判断。

## 实施顺序

1. 向内部 IAM 确认 OIDC 地址、`client_id`、回调白名单和用户信息字段。
2. 配置“内部群组 → Ai Power 角色”的映射，并先以工程师小范围试运行。
3. 将 `backend/app/services/sso_service.py` 的身份提供方适配器补齐：交换 code、校验 issuer/audience/nonce、拉取 userinfo、创建或更新本地用户、映射角色。
4. 为工具运行、工具管理、文件写入/删除、用户角色管理等 API 接入同一套后端权限依赖。
5. 对文件和工具继续配置细粒度的资源授权，并记录授权变更审计日志。
