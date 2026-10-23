/** Turn one MCP call result into the text and attachments a Cortico tool receipt carries. */
import type { BlobInput } from 'cortico/core/types.ts';

export interface FormattedCall {
  text: string;
  blobs: BlobInput[];
  failed: boolean;
}

/** Attachments are optional context; a receipt never fails because of them. */
const MAX_BLOBS = 4;
const MAX_BLOB_BYTES = 8 * 1024 * 1024;
const MAX_STRUCTURED_CHARS = 6000;

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function attachment(
  server: string,
  tool: string,
  data: unknown,
  mime: unknown,
  index: number,
): BlobInput | null {
  if (typeof data !== 'string' || typeof mime !== 'string') return null;
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length === 0 || bytes.length > MAX_BLOB_BYTES) return null;
  return {
    bytes,
    mime,
    name: `${server}-${tool}-${index}`,
    fallbackText: `${mime} returned by ${server}.${tool}, ${Math.round(bytes.length / 1024)} KB`,
  };
}

function resourceText(resource: Record<string, unknown>): string {
  const uri = typeof resource.uri === 'string' ? resource.uri : '(no uri)';
  if (typeof resource.text === 'string') return `${uri}:\n${resource.text}`;
  const mime = typeof resource.mimeType === 'string' ? resource.mimeType : 'binary';
  const bytes = typeof resource.blob === 'string' ? Buffer.from(resource.blob, 'base64').length : 0;
  return `${uri} (${mime}, ${Math.round(bytes / 1024)} KB)`;
}

/** Models see text; images and audio ride along as attachments when the endpoint accepts them. */
export function formatCallResult(server: string, tool: string, raw: unknown, maxChars: number): FormattedCall {
  const header = `[${server}.${tool}]`;
  if (!isObject(raw)) {
    return { text: `${header} ${raw === undefined ? 'no result' : String(raw)}`, blobs: [], failed: false };
  }
  if ('toolResult' in raw) {
    return { text: truncate(`${header} ${stringify(raw.toolResult)}`, maxChars), blobs: [], failed: false };
  }

  const failed = raw.isError === true;
  const blobs: BlobInput[] = [];
  const parts: string[] = [];
  const content = Array.isArray(raw.content) ? raw.content : [];

  content.forEach((item, index) => {
    if (!isObject(item)) {
      parts.push(String(item));
      return;
    }
    switch (item.type) {
      case 'text':
        if (typeof item.text === 'string') parts.push(item.text);
        break;
      case 'image':
      case 'audio': {
        const blob = attachment(server, tool, item.data, item.mimeType, index);
        if (blob && blobs.length < MAX_BLOBS) blobs.push(blob);
        const mime = typeof item.mimeType === 'string' ? item.mimeType : item.type;
        const size = typeof item.data === 'string' ? Math.round(Buffer.from(item.data, 'base64').length / 1024) : 0;
        parts.push(`[${item.type}: ${mime}, ${size} KB${blob ? '' : ', not attached'}]`);
        break;
      }
      case 'resource':
        parts.push(isObject(item.resource) ? resourceText(item.resource) : '[resource]');
        break;
      case 'resource_link': {
        const name = typeof item.name === 'string' ? item.name : '(unnamed resource)';
        const uri = typeof item.uri === 'string' ? item.uri : '';
        const description = typeof item.description === 'string' ? ` — ${item.description}` : '';
        parts.push(`[link] ${name}${uri ? ` <${uri}>` : ''}${description}`);
        break;
      }
      default:
        parts.push(`[${String(item.type)}] ${stringify(item)}`);
    }
  });

  if (isObject(raw.structuredContent)) {
    parts.push(`structuredContent:\n${truncate(stringify(raw.structuredContent), MAX_STRUCTURED_CHARS)}`);
  }

  const body = parts.join('\n').trim();
  return {
    text: truncate(`${header}${failed ? ' failed' : ''}\n${body || '(no content)'}`, maxChars),
    blobs,
    failed,
  };
}

function stringify(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? String(value);
  } catch (error) {
    return `[unreadable result: ${message(error)}]`;
  }
}

function truncate(text: string, maxChars: number): string {
  if (!Number.isFinite(maxChars) || maxChars <= 0 || text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n…[truncated]`;
}
