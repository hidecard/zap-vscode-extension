const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'package.json',
  'language-configuration.json',
  'extension.js',
  'lsp-client.js',
  'syntaxes/zap.tmLanguage.json',
  'snippets/zap.json',
  'examples/zap-custom.code-snippets',
  'icons/zap-logo.png',
  'icons/zap-file-icon.png',
  'icons/zap-file-icon-theme.json'
];
for (const relative of required) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) throw new Error(`missing extension file: ${relative}`);
}
for (const relative of ['package.json', 'language-configuration.json', 'syntaxes/zap.tmLanguage.json', 'snippets/zap.json', 'examples/zap-custom.code-snippets', 'icons/zap-file-icon-theme.json']) {
  JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}
const extensionSource = fs.readFileSync(path.join(root, 'extension.js'), 'utf8');
const lspSource = fs.readFileSync(path.join(root, 'lsp-client.js'), 'utf8');
const grammar = JSON.parse(fs.readFileSync(path.join(root, 'syntaxes/zap.tmLanguage.json'), 'utf8'));
const outputPattern = grammar.repository.builtins.patterns[0].match;
const builtinPattern = grammar.repository.builtins.patterns[1].match;
if (!outputPattern.includes('say') || outputPattern.includes('print')) {
  throw new Error('Zap output grammar must expose say without print');
}
for (const builtin of ['spawn', 'task_join', 'task_is_ready']) {
  if (!builtinPattern.includes(builtin)) throw new Error(`async builtin is missing from syntax grammar: ${builtin}`);
}
if (!lspSource.includes('Content-Length') || !lspSource.includes("request(method")) {
  throw new Error('LSP client framing or request transport is missing');
}
if (!extensionSource.includes('textDocument/definition') || !extensionSource.includes('textDocument/hover')) {
  throw new Error('LSP definition or hover provider is missing');
}
if (!extensionSource.includes('textDocument/signatureHelp') || !extensionSource.includes('registerSignatureHelpProvider')) {
  throw new Error('LSP signature-help provider is missing');
}
if (!extensionSource.includes('textDocument/formatting') || !extensionSource.includes('registerDocumentFormattingEditProvider')) {
  throw new Error('LSP formatting provider is missing');
}
const snippets = JSON.parse(fs.readFileSync(path.join(root, 'snippets/zap.json'), 'utf8'));
const customSnippets = JSON.parse(fs.readFileSync(path.join(root, 'examples/zap-custom.code-snippets'), 'utf8'));
for (const prefix of ['say', 'fn', 'asyncfn', 'ifelse', 'try', 'spawn', 'taskjoin', 'assert', 'main']) {
  if (!Object.values(snippets).some(snippet => snippet.prefix === prefix)) throw new Error(`missing built-in snippet: ${prefix}`);
}
if (!Object.values(snippets).find(snippet => snippet.prefix === 'say')?.body.join(' ').includes('say')) {
  throw new Error('say snippet must use canonical Zap output syntax');
}
if (!Object.values(customSnippets).some(snippet => snippet.prefix === 'api_fn')) {
  throw new Error('custom snippet template is missing');
}
if (!extensionSource.includes('registerCodeActionsProvider') || !extensionSource.includes('Remove unused variable') || !extensionSource.includes('Add import for')) {
  throw new Error('Zap quick-fix code actions are missing');
}
if (!extensionSource.includes('zap.runFile') || !extensionSource.includes('zap.checkWorkspace')) {
  throw new Error('extension commands are not registered');
}
if (!extensionSource.includes('zap.restartLanguageServer') || !extensionSource.includes('toCompletionItem')) {
  throw new Error('LSP restart or rich completion mapping is missing');
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const command of ['zap.formatFile', 'zap.lintFile', 'zap.buildWorkspace', 'zap.testWorkspace', 'zap.restartLanguageServer']) {
  if (!manifest.contributes.commands.some(item => item.command === command)) {
    throw new Error(`missing contributed command: ${command}`);
  }
}
if (manifest.contributes.configuration.properties['zap.formatOnSave']?.default !== false) {
  throw new Error('formatOnSave must default to false');
}
if (manifest.version !== '0.7.0' || manifest.contributes.configuration.properties['zap.lspRequestTimeout']?.default !== 10000) {
  throw new Error('0.7.0 metadata or LSP timeout setting is missing');
}
if (!extensionSource.includes('onWillSaveTextDocument') || !extensionSource.includes('workspace/symbol')) {
  throw new Error('save formatting or workspace symbol integration is missing');
}
if (manifest.icon !== 'icons/zap-logo.png' || !manifest.contributes.iconThemes?.some(theme => theme.path === './icons/zap-file-icon-theme.json')) {
  throw new Error('logo or Zap file icon theme is not contributed');
}
const grammarSource = fs.readFileSync(path.join(root, 'syntaxes/zap.tmLanguage.json'), 'utf8');
if (!grammarSource.includes('support.function.zap') || !grammarSource.includes('keyword.control.output.zap')) {
  throw new Error('Zap builtin or canonical say-output highlighting grammar is missing');
}
if (grammarSource.includes('say|print') || extensionSource.includes("'say', 'print'")) {
  throw new Error('non-canonical print output syntax must not be advertised');
}
for (const builtin of ['read_text', 'from_json', 'http_serve_once', 'process_run', 'assert', 'ok', 'err', 'unwrap_or', 'spawn', 'task_join', 'task_is_ready']) {
  if (!extensionSource.includes(`'${builtin}'`)) throw new Error(`missing stdlib completion: ${builtin}`);
}
console.log('Zap VS Code extension validation passed.');
