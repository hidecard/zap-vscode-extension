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
  'icons/zap-logo.png',
  'icons/zap-file-icon.png',
  'icons/zap-file-icon-theme.json'
];
for (const relative of required) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) throw new Error(`missing extension file: ${relative}`);
}
for (const relative of ['package.json', 'language-configuration.json', 'syntaxes/zap.tmLanguage.json', 'snippets/zap.json', 'icons/zap-file-icon-theme.json']) {
  JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}
const extensionSource = fs.readFileSync(path.join(root, 'extension.js'), 'utf8');
const lspSource = fs.readFileSync(path.join(root, 'lsp-client.js'), 'utf8');
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
if (!extensionSource.includes('zap.runFile') || !extensionSource.includes('zap.checkWorkspace')) {
  throw new Error('extension commands are not registered');
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const command of ['zap.formatFile', 'zap.lintFile', 'zap.buildWorkspace', 'zap.testWorkspace']) {
  if (!manifest.contributes.commands.some(item => item.command === command)) {
    throw new Error(`missing contributed command: ${command}`);
  }
}
if (manifest.contributes.configuration.properties['zap.formatOnSave']?.default !== false) {
  throw new Error('formatOnSave must default to false');
}
if (!extensionSource.includes('onWillSaveTextDocument') || !extensionSource.includes('workspace/symbol')) {
  throw new Error('save formatting or workspace symbol integration is missing');
}
if (manifest.icon !== 'icons/zap-logo.png' || !manifest.contributes.iconThemes?.some(theme => theme.path === './icons/zap-file-icon-theme.json')) {
  throw new Error('logo or Zap file icon theme is not contributed');
}
if (!fs.readFileSync(path.join(root, 'syntaxes/zap.tmLanguage.json'), 'utf8').includes('support.function.zap')) {
  throw new Error('Zap builtin highlighting grammar is missing');
}
console.log('Zap VS Code extension validation passed.');
