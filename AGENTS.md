# dsh-api-tools 工程规则

- 本目录是独立 Git 仓库；Git 操作必须以本目录为仓库根。不得提交或移动上级 `workspace/` 文件到本仓库，除非内容已确认可发布。
- `src/index.ts` 是无工具的 Web 宿主入口；`src/tool.ts` 是 Agent preset 内的工具注册入口；`src/client/` 只放配置界面。不得把 `./tool` 写进宿主 bundle patch。配置界面不得存储 Bearer Token，只能配置环境变量名。
- API 工具只能调用管理员配置的固定服务地址和固定路径；Agent 输入不得成为任意 URL、HTTP 方法或鉴权头。
- 修改工具执行逻辑时检查取消信号、超时、响应上限及返回给模型的数据。写接口应按目标 DSH 审批策略配置，插件不能假定调用已获批准。
- 提交前核对本仓库 Git 状态、差异和敏感信息，运行类型检查与相关测试，然后执行 `ocr review --audience agent --background "本次变更业务背景"`；审查结果留在上级 `workspace/dsh-api-tools/`，不得提交到本仓库。
