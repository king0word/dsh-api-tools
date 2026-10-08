# dsh-api-tools 工程规则

- 本目录是独立 Git 仓库；Git 操作必须以本目录为仓库根。不得提交或移动上级 `workspace/` 文件到本仓库，除非内容已确认可发布。
- `src/index.ts` 是无 Agent 工具的桌面版宿主入口；`src/tool.ts` 是 Agent preset 内的工具注册入口；`src/client/` 只放内嵌配置界面。不得把 `./tool` 写进宿主 bundle patch。配置界面不得存储 Bearer Token，只能配置环境变量名。
- API 工具只能调用管理员配置的固定服务地址和固定路径；Agent 输入不得成为任意 URL、HTTP 方法或鉴权头。
- 修改工具执行逻辑时检查取消信号、超时、响应上限及返回给模型的数据。写接口应按目标 DSH 审批策略配置，插件不能假定调用已获批准。
- 提交前核对本仓库 Git 状态、差异和敏感信息，运行类型检查与相关测试，并在 DSH 桌面版完成实际验收。测试未通过时不得提交。测试材料留在上级 `workspace/dsh-api-tools/`，不得提交到本仓库。
- 仅在用户明确要求调用 `open-code-review`（`ocr`）时才运行；构建、测试、代码检查、提交和推送均不自动触发 OCR。
