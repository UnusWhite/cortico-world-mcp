# cortico-world-mcp

[English](README.md) ｜ [简体中文](README_zh.md)

Owner:`src/world.ts`

一个 Cortico World:接 Model Context Protocol 服务器,给 bot 一条稳定的路去用它们的工具。服务器写在 `worlds.mcp.servers`;每个在挂载时启动,工具在那时发现,调用时可以重新读。

## 为什么是一个网关

这个 World 只提供三个工具:

| 工具 | 做什么 |
|---|---|
| `mcp_list_servers` | 服务器名、接入方式、连接状态与工具数。 |
| `mcp_list_tools` | 一个服务器的工具与它们的输入 schema;`refresh` 重新读目录。 |
| `mcp_call_tool` | 按参数对象调一个工具,回它的结果。 |

每个服务器工具各占一个工具位的话,bot 的工具表就会跟着「此刻哪些服务器起着」变:前缀与工具表不重启也变,名字在服务器之间会撞,而且每个服务器的 schema 每轮都要花上下文。网关把工具表固定下来,只发现任务要用的那部分;已连接的目录仍进前缀,模型不先调 `mcp_list_servers` 也知道有什么。

## 配置

`worlds.mcp.servers` 是键值对象,键是服务器名,值是它的设置。空字符串表示没有服务器。

```json
{
  "files": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp/docs"]
  },
  "issues": {
    "url": "https://mcp.example.com/mcp",
    "headers": { "Authorization": "Bearer ${ISSUES_TOKEN}" }
  }
}
```

| 字段 | 含义 |
|---|---|
| *(键)* | `mcp_call_tool` 里用的路由名;1–40 个字母、数字、`_` 或 `-`。 |
| `transport` | `stdio` 或 `http`;省略时从 `command` 或 `url` 推出来。 |
| `command`、`args`、`cwd`、`env` | 只对 stdio。子进程继承 SDK 的默认环境,加上应用自己的 `CORTICO_NODE_EXE` 与 `CORTICO_PNPM_CJS`,再叠 `env`。 |
| `url`、`headers` | 只对 http;Streamable HTTP。 |
| `${NAME}` | 在任何值里,读取部署密钥 `NAME`(部署的 `.env` 或进程环境)。 |

找不到的密钥展开成空串,并在运行日志里点名。

别的键放在 `worlds.mcp` 里 `servers` 旁边,不放进服务器条目:`connectTimeoutMs`(启动与列工具,默认 15 秒)、`callTimeoutMs`(一次调用,默认 60 秒)、`maxResultChars`(一次回执,默认 20 000)。冷的 `npx` 启动可能超过 15 秒,这类服务器把第一个调大。

服务器改动——列表本身、接入方式、命令——在 World 重启后生效。两个调用期的键每次调用现读。

## 行为

- 一个服务器连不上,不会拖垮 World 或别的服务器;它带着原因留在灯上,`mcp_list_servers` 会报出来。
- 连上之后掉线的服务器推一条 `mcp.server` 事件,带原因;World 停止不算。
- `mcp_call_tool` 的回执带服务器的文本、图片与音频;端点接受时图片与音频变成附件。超过 `maxResultChars` 的结果截断,接 `…[truncated]`。
- `isError` 的结果与传输失败都回成失败回执,带服务器的原因。
- World 默认禁用。没配服务器就启用,前缀里没有这一段,三个工具会说明缺什么。

## 模型能到什么

模型能到的,就是配置里那些服务器的工具。它不能加服务器、不能改命令、读不到配置,也没有任何「发现」:能到什么跟着配置走。filesystem 服务器指到一个盘,它就能读写那个盘;HTTP 服务器给的是那个端点给的东西;终端服务器给的是命令。加之前,按工具能做什么判断一下每个服务器。

包因此声明了 `unsafe` 与 `internet` 两个市场标签:这个「能到什么」属于配置,而常见的配置把文件访问或网上端点放在这些工具后面。

## 文件

| 文件 | 内容 |
|---|---|
| `src/definition.ts` | `WorldDefinition`:id、默认值、preflight、`create()`、`describe`。 |
| `src/config.ts` | `worlds.mcp` 段与 WebUI 配置组。 |
| `src/servers.ts` | 配置校验、默认值与密钥展开。 |
| `src/mcp.ts` | 一个 SDK 客户端:连接、目录、刷新、调用、关闭。 |
| `src/result.ts` | MCP 内容转成回执文本与附件。 |
| `src/world.ts` | 工具、事件、给前缀的目录、WebUI 声明。 |
| `src/i18n/` | 给人读的文案,11 种语言;`zh` 与 `en` 带全部键。 |
| `src/ENV_PROMPT.md` | 模型读到的环境提示词。 |
| `tests/` | 配置解析,以及测试自己起的一个真 stdio MCP 服务器。 |

`pnpm test` 与 `pnpm typecheck` 按 npm 上的 `cortico` 跑;在应用里,框架是随附的检出。

## 依赖

```bash
corepack pnpm install
```

在本目录跑一次。包自己的 `node_modules` 是部署加载这个 World 时 `@modelcontextprotocol/sdk` 能被找到的原因:本机目录以 `link:` 装入,只链源码、不往里装依赖,Node 从源码目录往上找 SDK。依赖住在父仓库里的检出,在父仓库重装或搬走之后就没了,World 会报 `Cannot find package '@modelcontextprotocol/sdk'`。

`pnpm-workspace.yaml` 让本目录成为自己的 pnpm 工作区根,这条命令就装在这里,不会往上找父检出。

## 许可证

AGPL-3.0-or-later,正文在 [LICENSE](LICENSE)。
