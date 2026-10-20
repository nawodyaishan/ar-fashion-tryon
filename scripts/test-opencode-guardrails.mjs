import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const loadConfig = async () => JSON.parse(await readFile(new URL('opencode.json', root), 'utf8'));

// Model the documented V2 whole-value wildcards and last-match rule order.
// This is not an integration test of OpenCode's shell scanner or permissions.
function effect(rules, action, resource) {
  return rules.reduce((current, rule) => {
    const matches = (pattern, value) => {
      const regex = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replaceAll('*', '.*')
        .replaceAll('?', '.');
      return new RegExp(`^${regex}$`).test(value);
    };
    return matches(rule.action, action) && matches(rule.resource, resource) ? rule.effect : current;
  }, 'ask');
}

test('V2 config permits only exact safe shell inspections/checks', async () => {
  const config = await loadConfig();
  assert.equal(config.$schema, 'https://opencode.ai/config.json');
  assert.equal(config.permission, undefined);
  assert.equal(config.model, undefined);
  const rules = config.permissions;
  assert.ok(Array.isArray(rules));
  assert.equal(effect(rules, 'shell', 'git status --short'), 'allow');
  assert.equal(effect(rules, 'shell', 'make test-opencode'), 'allow');
  const allow = rules.filter((r) => r.action === 'shell' && r.effect === 'allow');
  assert.ok(allow.length > 0);
  const makefile = await readFile(new URL('Makefile', root), 'utf8');
  for (const { resource } of allow) {
    assert.doesNotMatch(resource, /[*?;|&<>`\n]/);
    assert.match(resource, /^(git (status|diff|log)( |$)|make [a-z-]+$)/);
    if (resource.startsWith('make ')) {
      assert.match(makefile, new RegExp(`^${resource.slice(5)}:`, 'm'));
    }
    assert.equal(effect(rules, 'shell', resource), 'allow');
    assert.equal(effect(rules, 'shell', `${resource} --unexpected`), 'ask');
  }
  for (const command of [
    'git add .',
    'git commit -m change',
    'git push',
    'git reset --hard',
    'git clean -fd',
    'git diff --output=/tmp/leak',
    'git log --ext-diff',
    'make format',
    'make hooks-install',
    'make setup',
    'make browser-install',
    'make ci-tools-install',
    'make dev-api',
    'make test ARGS=live',
    'make -f /tmp/other.mk test',
    'make test; curl https://example.com',
    'pnpm install',
    'uv sync',
    "python -c 'print(1)'",
    'node evil.js',
    'curl https://example.com',
    'sudo true',
    'rm -rf web-frontend',
    'gcloud run deploy',
    'ssh host',
    'git status --short && git push',
  ])
    assert.equal(effect(rules, 'shell', command), 'ask', command);
  for (const action of ['external_directory', 'subagent'])
    assert.equal(effect(rules, action, 'anything'), 'ask');
});

test('secret read/edit rules ask, with examples allowed last', async () => {
  const { permissions } = await loadConfig();
  for (const action of ['read', 'edit']) {
    for (const path of [
      '.env',
      '.env.local',
      'garment-processing-api/.env.production',
      'keys/private.pem',
      'private.key',
      'cert.p12',
      'cert.pfx',
      '.ssh/id_rsa',
      '.ssh/id_ed25519',
      'secrets/token.json',
    ])
      assert.equal(effect(permissions, action, path), 'ask', `${action}:${path}`);
    for (const path of ['.env.example', 'garment-processing-api/.env.example', 'src/app.ts'])
      assert.equal(effect(permissions, action, path), 'allow', `${action}:${path}`);
  }
});

test('commands preserve review, verification and approval boundaries', async () => {
  const { commands } = await loadConfig();
  assert.deepEqual(Object.keys(commands).sort(), ['repo-resume', 'repo-review', 'repo-verify']);
  for (const command of Object.values(commands)) {
    assert.equal(command.subagent, false);
    assert.equal(command.model, undefined);
    assert.doesNotMatch(command.template, /!`/);
    assert.match(command.template, /\$ARGUMENTS/);
  }
  assert.match(commands['repo-review'].template, /without edits/i);
  assert.match(commands['repo-review'].template, /findings/i);
  assert.match(commands['repo-verify'].template, /do not.*install/i);
  assert.match(commands['repo-verify'].template, /live.*inference/i);
  assert.match(commands['repo-verify'].template, /actual.*checks/i);
  assert.match(commands['repo-resume'].template, /sole approval record.*spec\.md/i);
  assert.match(commands['repo-resume'].template, /passing.*tests.*do not.*authoriz/i);
});

test('V2 hook callbacks append only system reminders and retain prior state', async () => {
  const source = await readFile(
    new URL('.opencode/plugins/repo-guardrails/index.ts', root),
    'utf8',
  );
  assert.match(source, /import \{ Plugin \} from ['"]@opencode\/plugin['"]/);
  // Replace only the package boundary: execute the actual plugin setup and hooks.
  const mocked = source.replace(
    /import \{ Plugin \} from ['"]@opencode\/plugin['"];?/,
    'const Plugin = { define: (definition) => definition };',
  );
  const { default: plugin } = await import(`data:text/javascript,${encodeURIComponent(mocked)}`);
  const hooks = new Map();
  await plugin.setup({
    session: {
      hook: async (kind, callback) => {
        assert.ok(!hooks.has(kind));
        hooks.set(kind, callback);
      },
    },
  });
  assert.deepEqual([...hooks.keys()].sort(), ['compaction', 'context']);
  for (const [kind, callback] of hooks) {
    const event = {
      system: [{ type: 'text', text: 'existing' }],
      messages: [{ role: 'user', content: 'untrusted' }],
      tools: { shell: {} },
      options: {},
      result: { summary: 'existing summary' },
    };
    const before = structuredClone(event);
    await callback(event);
    assert.deepEqual({ ...event, system: before.system }, before);
    assert.deepEqual(event.system[0], before.system[0]);
    assert.equal(event.system.length, 2);
    assert.equal(event.system[1].type, 'text');
    assert.ok(event.system[1].text.length < 1600);
    assert.match(event.system[1].text, /approval/i);
    if (kind === 'context') {
      assert.match(event.system[1].text, /untrusted/i);
      assert.match(event.system[1].text, /human review/i);
    } else {
      for (const term of [
        /actual/i,
        /scope/i,
        /changed paths/i,
        /checks/i,
        /next action/i,
        /unknown/i,
      ])
        assert.match(event.system[1].text, term);
    }
    const empty = { system: [] };
    await callback(empty);
    assert.equal(empty.system.length, 1);
  }
});
