import type { McpText } from './index.ts';

const ko: McpText = {
  label: 'MCP',

  config: {
    title: 'MCP',
    description: 'Model Context Protocol 서버입니다. 사용하면 해당 도구를 mcp_list_servers, mcp_list_tools, mcp_call_tool로 사용합니다.',
    serversTitle: '서버',
    serversDescription:
      '서버는 서버 이름을 키로 하는 객체입니다. 값에 그 서버의 설정을 씁니다. command가 있으면 stdio(args, cwd, env는 선택), url이 있으면 http(headers는 선택)가 되며 transport를 직접 써도 됩니다. 값에 ${NAME}을 쓰면 배포 보안 비밀 NAME을 읽습니다. 예:{"files":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp/docs"]}}. 변경은 World를 다시 시작한 뒤 적용됩니다.',
    connectTimeoutTitle: '연결 시간 초과',
    connectTimeoutDescription: '서버가 시작해 도구를 나열할 때까지 기다리는 시간입니다. 넘기면 연결 실패로 기록합니다.',
    callTimeoutTitle: '호출 시간 초과',
    callTimeoutDescription: '도구 호출 한 번을 기다리는 시간입니다.',
    maxResultCharsTitle: '응답 한도',
    maxResultCharsDescription: '도구 응답 하나가 모델에 주는 최대 문자 수입니다. 넘는 부분은 잘립니다.',
  },

  promptDoc: {
    title: 'MCP · 환경 프롬프트',
    description: '시스템 접두사에서 MCP 도구와 연결된 서버를 설명하는 부분입니다.',
    catalog: '지금 연결된 서버와 그 도구입니다.',
  },

  lamps: {
    online: (tools) => `연결됨, 도구 ${tools}개`,
    error: (reason) => `연결 실패: ${reason}`,
    off: '연결되지 않음',
    none: '아직 서버가 설정되지 않았습니다.',
  },

  badges: {
    servers: '서버',
    tools: '도구',
  },
};

export default ko;
