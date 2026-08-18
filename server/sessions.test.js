import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  extractUserText,
  stripInjectedContext,
  buildGrokContext,
  buildGrokPrompt,
  readMessagesFromUpdates,
  sanitizePromptForTty,
  userChunkMatchesPrompt,
  consumeUpdateLines,
} from './sessions.js';

test('extractUserText keeps the last user_query and drops harness tags', () => {
  assert.equal(extractUserText('hello'), 'hello');
  assert.equal(extractUserText('<user_query>hi</user_query>'), 'hi');
  assert.equal(extractUserText('<user_info>os</user_info>'), '');
  assert.equal(
    extractUserText('<user_query>outer</user_query>\n<user_query>inner</user_query>'),
    'inner',
  );
  assert.equal(
    extractUserText('This session is being continued from a previous conversation that ran out of context.'),
    '',
  );
});

test('stripInjectedContext keeps only the user sentence after last-pick context', () => {
  const dumped = [
    '用户当前正在看这个 Chrome 页面：',
    'url: http://127.0.0.1:3100/x',
    'title: 智能体工场',
    '用户选中了这个元素。以 DOM 定位为准（不要靠猜截图）：',
    'selector: ul.grid',
    'siblings: div:"文档 1 个"',
    'element crop (optional visual): /tmp/crop.jpg',
    '截图是选中元素附近的小图，不是整页。改颜色/间距可看；改文案/结构/写源码优先用上面的 DOM，不必先 read_file。',
    '',
    '这里没有横向占满，导致竖向超出了',
  ].join('\n');
  assert.equal(stripInjectedContext(dumped), '这里没有横向占满，导致竖向超出了');
  assert.equal(
    extractUserText(`<user_query>\n${dumped}\n</user_query>`),
    '这里没有横向占满，导致竖向超出了',
  );
  assert.equal(extractUserText(dumped), '这里没有横向占满，导致竖向超出了');
});

test('buildGrokPrompt still concatenates context for tests, context is separate', () => {
  const ctx = buildGrokContext({
    page: { url: 'http://127.0.0.1:3100/x', title: 't' },
    pick: { selector: 'button.save', tag: 'button', text: '提交' },
  });
  assert.match(ctx, /用户选中了这个元素/);
  assert.doesNotMatch(ctx, /改文案/);
  const prompt = buildGrokPrompt({
    text: '改成保存',
    page: { url: 'http://127.0.0.1:3100/x', title: 't' },
    pick: { selector: 'button.save', tag: 'button', text: '提交' },
  });
  assert.match(prompt, /改成保存$/);
});

test('readMessagesFromUpdates matches TUI user/assistant chunks and strips last-pick', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-session-'));
  const dumped = [
    '用户当前正在看这个 Chrome 页面：',
    'url: http://127.0.0.1:3100/x',
    '用户选中了这个元素。以 DOM 定位为准（不要靠猜截图）：',
    'selector: ul.grid',
    'element crop (optional visual): /tmp/crop.jpg',
    '截图是选中元素附近的小图，不是整页。改颜色/间距可看；改文案/结构/写源码优先用上面的 DOM，不必先 read_file。',
    '',
    '这里没有横向占满，导致竖向超出了',
  ].join('\n');
  const rows = [
    {
      params: {
        update: {
          sessionUpdate: 'user_message_chunk',
          content: { type: 'text', text: '你再开一个页签测试一下' },
          _meta: { promptIndex: 1 },
        },
      },
    },
    {
      params: {
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: '好的，先开页签。' },
        },
      },
    },
    { params: { update: { sessionUpdate: 'turn_completed' } } },
    {
      params: {
        update: {
          sessionUpdate: 'user_message_chunk',
          content: { type: 'text', text: '[Image #1] ' },
          _meta: { promptIndex: 2 },
        },
      },
    },
    {
      params: {
        update: {
          sessionUpdate: 'user_message_chunk',
          content: { type: 'text', text: '底部间距跟左右不一样' },
          _meta: { promptIndex: 2 },
        },
      },
    },
    {
      params: {
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: '已修好。' },
        },
      },
    },
    {
      params: {
        update: {
          sessionUpdate: 'user_message_chunk',
          content: { type: 'text', text: dumped },
          _meta: { promptIndex: 3 },
        },
      },
    },
    {
      params: {
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: '改为单列。' },
        },
      },
    },
  ];
  fs.writeFileSync(path.join(dir, 'updates.jsonl'), rows.map((row) => JSON.stringify(row)).join('\n'));
  const messages = readMessagesFromUpdates(dir);
  assert.deepEqual(
    messages.map((msg) => [msg.role, msg.text]),
    [
      ['user', '你再开一个页签测试一下'],
      ['assistant', '好的，先开页签。'],
      ['user', '[Image #1] 底部间距跟左右不一样'],
      ['assistant', '已修好。'],
      ['user', '这里没有横向占满，导致竖向超出了'],
      ['assistant', '改为单列。'],
    ],
  );
});

test('sanitizePromptForTty flattens newlines and strips controls', () => {
  assert.equal(sanitizePromptForTty('a\nb\r\nc'), 'a b c');
  assert.equal(sanitizePromptForTty('  hello \u0007 '), 'hello');
});

test('consumeUpdateLines waits for the matching user turn then streams the reply', () => {
  const state = { sawUser: false, userText: '', text: '' };
  const line = (update) => JSON.stringify({ params: { update } });
  const first = consumeUpdateLines(
    [
      line({ sessionUpdate: 'agent_message_chunk', content: { text: '还在上一轮' } }),
      line({ sessionUpdate: 'turn_completed' }),
    ],
    state,
    '改成单列',
  );
  assert.deepEqual(first, []);
  assert.equal(state.sawUser, false);

  const second = consumeUpdateLines(
    [
      line({ sessionUpdate: 'user_message_chunk', content: { text: '改成单列' } }),
      line({ sessionUpdate: 'agent_message_chunk', content: { text: '好的' } }),
      line({ sessionUpdate: 'agent_message_chunk', content: { text: '，已改。' } }),
      line({ sessionUpdate: 'turn_completed' }),
    ],
    state,
    '改成单列',
  );
  assert.deepEqual(second, [
    { type: 'text', data: '好的' },
    { type: 'text', data: '，已改。' },
    { type: 'done' },
  ]);
  assert.equal(state.text, '好的，已改。');
  assert.equal(userChunkMatchesPrompt('改成单列', '改成单列'), true);
});
