# DSH API Tools

将一组固定 HTTP API 注册成 DSH Agent 工具。每个 `endpoints` 项对应一个工具。安装、配置标准、验收和回退见 [安装与接入指南](docs/安装与接入指南.md)。

## DSH 内嵌配置界面

浏览器插件在 DSH 右侧栏注册“API 工具”页，可编辑服务地址、Bearer Token 环境变量名、超时、响应上限和接口清单。环境变量名必须以 `DSH_API_` 开头，避免误用其他环境变量。它会校验并导出 JSON，也可将草稿留在当前浏览器的 localStorage。**保存草稿或导出文件不会热更新工具注册表**；部署人员仍需把审核后的配置装载到目标 Agent 的 Cordis 插件配置中，再重启或重载该 Agent。界面不接受密钥值。

当前构建入口是 `npm run build`，需要 Node 22.18+ 或 24.11+；`lib/index.js` 是无工具的 Web 宿主入口，`lib/tool.js` 是仅由目标 Agent preset 加载的工具入口，`lib/client.js` 是浏览器插件。`dsh.client` 声明使用当前 DSH Web 插件加载机制，侧栏依赖 `dsh-better-sidebar`。

配置示例（示意地址，不会被自动加载）：

```yaml
baseUrl: https://api.example.com
tokenEnv: DSH_API_ORDER_TOKEN
timeoutMs: 15000
maxResponseChars: 20000
endpoints:
  - name: get_order
    description: 根据订单号查询订单
    method: GET
    path: /orders
  - name: create_order
    description: 创建订单
    method: POST
    path: /orders
```

Agent 调用时，`query` 和 `body` 均为 JSON 字符串；例如 `get_order` 的 `query` 为 `{"id":"123"}`。插件只接受配置好的 HTTP(S) 服务地址和接口路径，不接受 Agent 传入任意 URL。鉴权目前只支持环境变量中的 Bearer Token；密钥不写入配置。HTTP 状态码、响应文本和截断标志作为工具结果返回。

`baseUrl` 是管理员配置的信任目标，允许有意配置内网 API；部署时只填写已授权的服务地址，Bearer Token 会发送给该地址。响应按字符上限流式读取，超限后标记 `truncated` 并取消剩余读取。

正式接入前需提供目标 API 文档、允许 Agent 使用的接口清单、鉴权方式及目标 DSH profile。涉及创建、修改或删除数据的接口应明确是否需要 Agent 审批；本骨架没有代替 DSH 的审批策略。
