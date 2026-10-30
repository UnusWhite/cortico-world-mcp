import { afterEach, describe, expect, it } from 'vitest';
import { childEnvironment } from '../src/mcp.ts';

const saved = process.env.CORTICO_NODE_EXE;

afterEach(() => {
  if (saved === undefined) delete process.env.CORTICO_NODE_EXE;
  else process.env.CORTICO_NODE_EXE = saved;
});

describe('child environment for stdio servers', () => {
  it('passes the app path the command shims run', () => {
    process.env.CORTICO_NODE_EXE = 'C:\\app\\Coopanion.exe';
    expect(childEnvironment().CORTICO_NODE_EXE).toBe('C:\\app\\Coopanion.exe');
  });

  it('keeps the SDK defaults', () => {
    const env = childEnvironment();
    if (process.env.PATH) expect(env.PATH).toBe(process.env.PATH);
  });

  it('lets a server entry override an inherited value', () => {
    process.env.CORTICO_NODE_EXE = 'C:\\app\\Coopanion.exe';
    expect(childEnvironment({ CORTICO_NODE_EXE: 'D:\\other\\node.exe' }).CORTICO_NODE_EXE)
      .toBe('D:\\other\\node.exe');
  });
});
