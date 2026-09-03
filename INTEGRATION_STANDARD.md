# ai-platform 第三方工具集成标准规范（V1.0）

> **目的**：规范化第三方工具接入 ai-platform 的统一标准，约束后续他人开发与集成，
> 使任何工具按此规范开发后，平台可零/低改动地一键接入。
>
> **覆盖三类工具**：
> - **A 类 · 后端工具**（如 CP 报表生成器）：有源码、可跨平台、自带后端 + 前端页面
> - **B 类 · AI/RAG 工具**（如功率器件知识库）：Python 服务 + 大模型/向量检索（Streamlit 等）
> - **C 类 · 纯前端 dist**：仅静态文件，无后端

---

## 一、工具分类判定表

开发前先判定工具属于哪一类，按对应章节规范开发：

| 判定特征 | 类型 | 集成路径 |
|---------|------|---------|
| 有源码 + 后端服务 + 自带前端页面 | **A 后端工具** | `/<前缀>/` nginx 反代 → 容器 |
| Python 服务 + LLM/向量库/检索 + Web 界面(Streamlit/Flask) | **B AI/RAG 工具** | `/<前缀>/` 反代 + 大体积数据挂载卷 |
| 仅静态文件(dist/build), 无后端 | **C 纯前端** | nginx alias 直接托管 |

---

## 二、通用硬性规范（三类都必须遵守）

### 2.1 目录结构
所有工具统一放在 `third_party/<tool_name>/`，且满足：

```
third_party/<tool_name>/
├── （见 A/B/C 各自章节的结构）
├── requirements.txt / package.json   # 跨平台依赖
├── .dockerignore                     # 排除 构建产物/venv/密钥
└── README.md                         # ★ 必需: 说明如何构建/启动/访问
```

### 2.2 命名与版本
- 工具名：小写下划线（如 `cp_report_generator`）。
- 目录内禁止提交：`dist/`、`*.exe`、`*.bat`、`*.spec`、`venv/`、`__pycache__/`、`.git/`、模型大文件、密钥。

### 2.3 安全与密钥
- **严禁**在代码/镜像/仓库提交密钥（API Key、token、数据库密码）。
- 密钥一律通过**环境变量**注入（容器 `environment` / compose 变量），本地用 `.env`（加入 `.gitignore`）。

### 2.4 端口规范
- 容器**只 expose 内部端口，不映射宿主端口**（规避冲突）。
- 统一入口由 nginx 按 `/<前缀>/` 对外。
- 若确需对外端口，须支持**端口占用自动切换**。

### 2.5 数据持久化
- 业务数据、向量库、模型等大体积/需持久化的内容走**挂载卷**，不进镜像。
- 镜像只含代码 + 依赖。

### 2.6 依赖
- 依赖走**华为内网 pip/npm 源**（`mirrors.tools.huawei.com`），服务器在线安装，**不搬运**依赖包。
- 需求文件须为**完整清单**（含传递依赖，如 torch/transformers 等），避免 Linux 上缺包。

### 2.7 环境隔离
- 明确区分生产事件：`docker compose up -d --build`；开发环境：本地起服务 + `vite.config.ts` proxy。

---

## 三、A 类 · 后端工具规范（CP 类）

### 3.1 目录结构
```
third_party/<tool_name>/
├── app.py                   # 后端入口
├── <模块>.py                # 业务逻辑(跨平台)
├── index.html               # 前端页面(由后端托管)
├── requirements.txt         # 跨平台依赖
├── Dockerfile
├── .dockerignore
└── data/                    # 用户数据(挂载卷)
```

### 3.2 开发要求（供他人遵循）
1. **后端改造**：
   - 去掉 Windows 专属依赖（`pythoncom`/`win32com`）。
   - 监听 `0.0.0.0`，固定内部端口。
   - **加根路由 `'/'` 返回 `index.html`**（前端由后端托管，统一反代）。
2. **前端 API_BASE 自动推导**（不写死 IP/端口）：
   ```js
   const API_BASE = window.location.origin + '/<前缀>';
   ```
3. **数据目录**：`data/` → 挂载卷持久化。

### 3.3 Dockerfile 关键点
- 基础镜像 `python:3.10-slim`。
- 用 matplotlib 画中文字图 → `apt-get install fonts-noto-cjk`。
- `EXPOSE <内部端口>`，不映射宿主。

### 3.4 nginx 反代
```nginx
location /<前缀>/ {
    proxy_pass http://<容器名>:<端口>/;   # 末尾 / 去掉前缀
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 300s;
}
```

---

## 四、B 类 · AI/RAG 工具规范（Streamlit 类）

### 4.1 目录结构
```
third_party/<tool_name>/
├── app.py / app/
├── scripts/            # 检索/嵌入/LLM 调用
├── config.yaml
├── requirements-linux.txt   # 完整依赖清单(含torch等)
├── Dockerfile
└── data 常量目录(见 4.5 挂载)
```

### 4.2 关键开发要求
1. **路径可配置**：数据/模型/向量库路径通过**环境变量**覆盖（如 `RAG_DATA_DIR`），容器内指向挂载点。**禁止硬编码绝对路径**。
2. **嵌入模型离线加载**：模型放本地目录，设 `HF_HUB_OFFLINE=1` 避免外网下载。
3. **LLM API 密钥**：`环境变量`注入，默认值不写死密钥。
4. **多个 AI 模型维度对齐**：嵌入向量维度需与向量库已有索引一致（如 bge-m3 = 1024 维）。

### 4.3 Streamlit 子路径部署（重点）
- 设 `--server.baseUrlPath=/<前缀>`（或环境变量 `STREAMLIT_SERVER_BASEURLPATH`）→ 资源链接带前缀。
- nginx 反代**必须支持 WebSocket**：
  ```nginx
  location /<前缀>/ {
      proxy_pass http://<容器名>:8501/;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_read_timeout 300s;
  }
  # Streamlit WebSocket 端点(按应用实际路径)
  location /<前缀>/_stcore/ { ...同样的ws头... }
  ```

### 4.4 Dockerfile 关键点
- `python:3.10-slim` + 完整 `requirements-linux.txt` + 内网 pip 源。
- LLM 密钥环境变量注入，不硬编码。
- 大模型/向量库**不进镜像**（走挂载）。

### 4.5 挂载卷（模型/数据/向量库）
| 内容 | 宿主 | → 容器 |
|------|------|--------|
| 模型 | `/data/<tool>/models` | `/rag_data/models` |
| 知识库/文档 | `/data/<tool>/knowledge_base` | `/rag_data/knowledge_base` |
| 向量库 | `/data/<tool>/chroma` | `/rag_data/db/chroma` |
| 日志 | `/data/<tool>/logs` | `/rag_data/logs` |

> 容器内程序读取 `RAG_DATA_DIR`（或其他约定环境变量）指向挂载根，与宿主路径解耦。

---

## 五、C 类 · 纯前端 dist 规范

### 5.1 目录结构
```
third_party/<tool_name>/
├── dist/                # 构建产物(唯一需要的东西)
├── src/ (可选源码)
└── package.json
```

### 5.2 集成方式（nginx alias，无容器）
- 构建产物 `dist/` 放到服务器，nginx `alias` 直接托管。
- **前端 API_BASE 自动推导**，同 A 类：
  ```js
  const API_BASE = window.location.origin + '/<前缀>';
  ```

### 5.3 nginx alias
```nginx
location /<前缀>/ {
    alias /data/static/<tool_name>/;   # 指向 dist 内容
    index index.html;
    try_files $uri $uri/ /<前缀>/index.html;   # SPA 回退(如需)
}
```

### 5.4 注意
- 无后端 → 不涉及容器/反代/数据库。
- 若需调用后端接口，通过 `API_BASE` 指向同域路径或显式配置。

---

## 六、数据库登记规范（A、B 类适用）

在平台 `tools` 表登记，`type` 分别：
- A 类：`external`（反代到容器）
- B 类：`external`（反代到容器，带 WebSocket）
- C 类：`static`（alias 静态托管）

```sql
INSERT INTO tools (name, type, source, config) VALUES (
  '<工具名>',
  '<external|static>',
  '/<前缀>/',
  '{"container":"<容器名>","port":<端口>,"prefix":"/<前缀>","data_vol":"<卷名>","icon":"<图标>"}'
);
```

---

## 七、验收清单（通用模板，按类勾选）

**通用**
- [ ] 代码无密钥提交；`.dockerignore`/`.gitignore` 排除大文件与密钥
- [ ] 依赖走内网源可完整安装
- [ ] 目录无 `dist/`/`*.exe`/`*.bat`/`venv` 等残留

**A 类**
- [ ] `curl -I http://<IP>/<前缀>/` → 200 + HTML
- [ ] 中文不方块；真实业务操作成功；换 IP 仍正常（API 推导）

**B 类**
- [ ] 子路径访问正常，资源带前缀；WebSocket 有效
- [ ] 模型加载 + 检索 + LLM 问答完整链路通过
- [ ] 大模型/向量库从挂载卷读取，未进镜像

**C 类**
- [ ] 静态页可访问；SPA 刷新不 404（如适用）

---

## 八、平台接入三步总纲（A/B/C 通用）

1. **放入平台**：代码入 `third_party/<tool_name>/`，遵守本章节结构规范。
2. **接入反代/托管**：A/B → nginx location + docker-compose 服务；C → nginx alias。
3. **登记**：tools 表插入记录，工具卡可访问。

---

## 九、文件中心（FileCenter）接入规范（V1.0）

> 文件中心是平台统一的通用文件存储，供各业务工具按分组/功能型/工具组织、共享与消费文件。
> 提供后端 API（`services/aixsilicon-api`，前缀 `/api/v1/files`）与前端选文件器（FilePicker）。

### 9.1 核心后端 API（均需 Bearer token，`Authorization: Bearer <accessToken>`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/files/divisions` | 八组×三型目录结构 |
| POST | `/api/v1/files/upload` | 上传单文件 |
| POST | `/api/v1/files/upload/chunk/init` | 分片-初始化（>5MB 用分片） |
| POST | `/api/v1/files/upload/chunk` | 分片-上传单片 |
| POST | `/api/v1/files/upload/chunk/complete` | 分片-合并完成 |
| GET | `/api/v1/files` | 文件清单（group_name/func_type/namespace/keyword/page 过滤） |
| GET | `/api/v1/files/tree` | 分组→功能型→工具→文件 树 |
| GET | `/api/v1/files/{id}/download` | 下载文件（返回原文件名） |
| PATCH | `/api/v1/files/{id}` | 重命名/移动/打标签/归档 |
| DELETE | `/api/v1/files/{id}` | 删除（仅 owner/超管） |

文件落盘根：容器内 `FILE_STORAGE_ROOT`（默认 `/data/files`），目录结构
`<root>/<一级分组>/<功能型>/<工具namespace>/<原文件名>`；文件名冲突物理追加短序号，
但 DB 展示名 `filename` 保留原名，`storage_path` 存物理序号名。

### 9.2 工具侧接入文件中心（推荐模式）

> 关键前提：工具页面与文件中心**同源**（都经 nginx:80 反代），因此
> **浏览器 localStorage 中的平台 token 与文件中心会话天然共享**，FilePicker iframe 可直接鉴权。

1. **选取**：工具页面内嵌 iframe 指向 `/files/picker?group=&func=&ns=&multi=&title=`，
   监听 `window` 的 `postMessage`：
   - 确定 → `{ type:'FILE_PICKER_RESULT', files: FileAsset[] }`（`FileAsset` 含 `id`/`filename` 等）
   - 取消 → `{ type:'FILE_PICKER_CANCEL' }`
2. **拉取（浏览器侧持 token）**：`GET /api/v1/files/{id}/download`（同源，携
   `Authorization`）拿到字节/Blob。
3. **落盘到工具后端**：`POST <工具>/api/import_asset`（multipart：`file` + `target`(spc|data) + `batch`），
   工具后端把文件写入自身挂载的数据卷（如 `/data/import/<batch>/<target>/`），返回本地绝对路径，供算法引擎读取。

> 说明：**让浏览器持 token 下载、再交给工具后端落盘**，而非"工具后端直连文件中心 API"，
> 是因为 token 在浏览器会话中；工具容器无 SSO token，服务端直连需额外鉴权通道，本规范暂不采用。

### 9.3 参考实现（P3b 已落地）

- 文件中心 API：`services/aixsilicon-api/app/api/v1/files.py`
- FilePicker 页面：`apps/aixsilicon-web/src/pages/FilePicker/index.tsx`（路由 `/files/picker`）
- 可复用弹窗组件：`apps/aixsilicon-web/src/features/files/components/FilePickerModal.tsx`
  + barrel `src/features/files/index.ts`（`FilePickerModal`、`useFiles`、`fileApi`）
- 报表工具（A 类）接入：`third_party/cp_report_generator`
  - 后端 `app.py`：`POST /api/import_asset`、`POST /api/import_asset/clear`（落盘 `/data/import/`）
  - 前端 `index.html`：`openPicker(target)` 弹 iframe + `importSelectedFiles()` 下载并导入
- 前端 token 读取兜底：依次查 `aixsilicon-auth` / `auth-store` / `useAuthStore` 各 zustand 键。

### 9.4 边界与约束

- 文件中心是**通用共享存储**，与工具自身专用数据（如 RAG 精加工知识库）**语义不同**，
  不要强行共享挂载卷混合两者；RAG 等只读消费场景应走"导入到工具数据卷"而非直读 `/data/files`。

---

## 附：参考
- 通用技能：`skills/third-party-tool-integration/SKILL.md`、`skills/tool-integration-standard/SKILL.md`
- 已落地实例：A 类 `cp_report_generator`；B 类 `third_party/rag`
- 模板：`templates/`（Dockerfile / nginx_location / docker_service / api_base / tool_register）
