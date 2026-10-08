# DSH API Tools

把一组固定 HTTP API 映射成 DSH 桌面版 Agent 工具。每条接口对应一个工具，Agent 只能提供查询参数和请求体，不能改服务地址、方法、路径或鉴权方式。

## 桌面版使用流程

1. 在 DSH 桌面版“插件”页安装并启用本插件，进入组合包详情中的“API 工具配置”。
2. 填写服务地址、可选的 Bearer Token **环境变量名**、超时和接口清单。真实 Token 只放在 DSH 宿主进程环境变量中。
3. 在“创建独立 Agent preset”区域填写新名称，点击“创建新 Agent preset（重启后生效）”。插件只追加 `dsh-api-<名称>` 的声明，遇到同名声明会拒绝覆盖，不改任何已有 preset。
4. 完全退出并重启 DSH 桌面版，在新会话的模式选择器中选择“API 测试 <名称>”。已有会话不会自动切换工具。

“保存草稿”只保存在当前桌面应用的 localStorage；“导出配置 JSON”只下载文件。这两个操作不装载 Agent 工具。创建 preset 会向 `$DSH_HOME/profiles/desktop/cordis.patch.yml` 追加独立 preset 声明，并备份修改前的文件。当前 DSH 不读取旧式 `$DSH_HOME/.agent-presets/<id>/` 目录。

插件的宿主入口提供创建 preset 的受控远程方法；`lib/tool.js` 只在选中的 Agent preset 中装载。安装组合包本身不会向所有 Agent 开放 API。详细安装、验收和回退步骤见 [安装与接入指南](docs/安装与接入指南.md)。

## 配置示例

```yaml
baseUrl: http://127.0.0.1:18891
timeoutMs: 15000
maxResponseChars: 20000
endpoints:
  - name: hello_agent
    description: 根据 name 参数返回问候语
    method: GET
    path: /api/hello
```

Agent 调用 `hello_agent` 时可传入 `query` 字符串 `{"name":"Agent"}`。工具返回 HTTP 状态码、响应文本和 `truncated` 标志。写接口仍须按目标 DSH 的审批策略单独验收。
