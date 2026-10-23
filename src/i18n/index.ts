/**
 * The text this World shows people. `zh.ts` and `en.ts` carry every key; every other language's
 * file is read whole, and a missing top-level group falls back to `zh.ts` for `zh-Hant` and
 * `en.ts` for the rest, through Cortico's `pick`.
 */
import type { Language, LanguageTable } from 'cortico/core/language.ts';
import zh from './zh.ts';
import en from './en.ts';
import zhHant from './zh-Hant.ts';
import ja from './ja.ts';
import ko from './ko.ts';
import fr from './fr.ts';
import de from './de.ts';
import es419 from './es-419.ts';
import ptBR from './pt-BR.ts';
import it from './it.ts';
import ru from './ru.ts';

export interface McpText {
  label: string;
  config: {
    title: string;
    description: string;
    serversTitle: string;
    serversDescription: string;
    connectTimeoutTitle: string;
    connectTimeoutDescription: string;
    callTimeoutTitle: string;
    callTimeoutDescription: string;
    maxResultCharsTitle: string;
    maxResultCharsDescription: string;
  };
  promptDoc: {
    title: string;
    description: string;
    catalog: string;
  };
  lamps: {
    online: (tools: number) => string;
    error: (reason: string) => string;
    off: string;
    none: string;
  };
  badges: {
    servers: string;
    tools: string;
  };
}

export const MCP_TEXT: LanguageTable<McpText> = {
  zh, en, 'zh-Hant': zhHant, ja, ko, fr, de, 'es-419': es419, 'pt-BR': ptBR, it, ru,
};

/** The table of `language`; `zh` when absent. */
export function mcpText(language: Language = 'zh'): McpText {
  return MCP_TEXT[language] ?? MCP_TEXT.en;
}
