const vscode = require('vscode');
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const { ZapLspClient } = require('./lsp-client');

const diagnosticCollection = vscode.languages.createDiagnosticCollection('zap');
let diagnosticTimer;
let lspClient;

const KEYWORDS = [
  'and', 'as', 'async', 'await', 'break', 'catch', 'case', 'class', 'const',
  'continue', 'defer', 'elif', 'else', 'enum', 'for', 'fn', 'if', 'import',
  'in', 'let', 'match', 'module', 'mut', 'not', 'or', 'pass', 'private',
  'protected', 'pub', 'raise', 'return', 'self', 'static', 'struct', 'try',
  'var', 'while'
];
const TYPES = ['any', 'bool', 'future', 'list', 'map', 'none', 'number', 'option', 'result', 'set', 'text', 'unknown'];
const BUILTINS = [
  'say', 'len', 'type', 'range', 'enumerate', 'zip', 'map', 'filter', 'reduce',
  'now', 'sleep', 'has_env', 'env', 'env_get', 'config_dir', 'config_path',
  'path_join', 'basename', 'dirname', 'read_text', 'write_text', 'read_lines', 'write_lines',
  'json', 'from_json', 'json_parse', 'json_stringify', 'str', 'upper', 'lower', 'trim',
  'split', 'join', 'get', 'contains', 'is_empty', 'sort', 'replace', 'abs', 'min', 'max', 'pow', 'sqrt', 'sum', 'keys',
  'count', 'reverse', 'range', 'exists', 'url_parse', 'url_encode', 'url_decode', 'http_get',
  'http_request', 'http_serve_once', 'process_run', 'assert',
  'ok', 'err', 'some', 'option_none', 'is_ok', 'is_err', 'is_some', 'unwrap', 'unwrap_or',
  'spawn', 'task_join', 'task_is_ready'
];

function executable() {
  return vscode.workspace.getConfiguration('zap').get('executable', 'zap');
}

function workspaceRoot() {
  const folder = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor?.document.uri);
  return folder ? folder.uri.fsPath : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function runCli(args, cwd, callback) {
  cp.execFile(executable(), args, { cwd, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, callback);
}

function parseJsonDiagnostic(stdout, stderr, cwd) {
  let value;
  try {
    value = JSON.parse(stdout.trim());
  } catch (_) {
    return [{
      message: (stderr || stdout || 'Zap check failed').trim(),
      file: undefined,
      line: 1,
      column: 1,
      kind: 'Project'
    }];
  }
  if (!value || value.ok) return [];
  return [{
    message: value.message || value.error || 'Zap check failed',
    file: value.file ? path.resolve(cwd, value.file) : undefined,
    line: Number(value.line) || 1,
    column: Number(value.column) || 1,
    kind: value.kind || 'Error'
  }];
}

function refreshDiagnostics(document) {
  const config = vscode.workspace.getConfiguration('zap');
  if (!config.get('enableDiagnostics', true) || document.languageId !== 'zap') return;
  const root = workspaceRoot() || path.dirname(document.uri.fsPath);
  // `zap check` requires a project manifest. For a standalone .zp file,
  // let the LSP provide diagnostics instead of showing a misleading manifest error.
  if (!fs.existsSync(path.join(root, 'zap.toml'))) {
    return;
  }
  runCli(['check', '--json', root], root, (error, stdout, stderr) => {
    if (document.isClosed) return;
    const items = parseJsonDiagnostic(stdout, stderr, root)
      .filter(item => !item.file || path.resolve(item.file) === path.resolve(document.uri.fsPath));
    const diagnostics = items.map(item => {
      const line = Math.max(0, item.line - 1);
      const column = Math.max(0, item.column - 1);
      const range = new vscode.Range(line, column, line, column + 1);
      const severity = item.kind === 'Project' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error;
      const diagnostic = new vscode.Diagnostic(range, item.message, severity);
      diagnostic.source = 'zap';
      diagnostic.code = item.kind;
      return diagnostic;
    });
    diagnosticCollection.set(document.uri, diagnostics);
  });
}

function scheduleDiagnostics(document) {
  clearTimeout(diagnosticTimer);
  diagnosticTimer = setTimeout(() => refreshDiagnostics(document), vscode.workspace.getConfiguration('zap').get('diagnosticDelay', 350));
}

function runCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'zap') {
    vscode.window.showWarningMessage('Open a .zp file before running Zap.');
    return;
  }
  const file = editor.document.uri.fsPath;
  const cwd = path.dirname(file);
  if (vscode.workspace.getConfiguration('zap').get('runInTerminal', true)) {
    const terminal = vscode.window.createTerminal({ name: 'Zap', cwd });
    terminal.show(true);
    terminal.sendText(`${quote(executable())} run ${quote(file)}`);
  } else {
    runCli(['run', file], cwd, (error, stdout, stderr) => {
      const channel = vscode.window.createOutputChannel('Zap');
      channel.clear();
      channel.append(stdout || stderr || 'Zap finished.');
      channel.show(true);
      if (error) vscode.window.showErrorMessage(`Zap exited with code ${error.code ?? 'unknown'}.`);
    });
  }
}

function quote(value) {
  if (process.platform === 'win32') return `"${String(value).replace(/"/g, '\\"')}"`;
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function currentZapDocument() {
  const document = vscode.window.activeTextEditor?.document;
  if (!document || document.languageId !== 'zap') {
    vscode.window.showWarningMessage('Open a .zp file before using a Zap command.');
    return undefined;
  }
  return document;
}

function formatEdits(document) {
  if (!lspClient || !lspClient.started) return Promise.resolve([]);
  return lspClient.request('textDocument/formatting', {
    textDocument: { uri: document.uri.toString() },
    options: { tabSize: 4, insertSpaces: true }
  }).then(edits => (edits || []).map(edit => new vscode.TextEdit(
    new vscode.Range(
      edit.range.start.line,
      edit.range.start.character,
      edit.range.end.line,
      edit.range.end.character
    ),
    edit.newText || ''
  )));
}

function formatCurrentFile() {
  const document = currentZapDocument();
  if (!document) return;
  formatEdits(document)
    .then(edits => {
      const workspaceEdit = new vscode.WorkspaceEdit();
      workspaceEdit.set(document.uri, edits);
      return vscode.workspace.applyEdit(workspaceEdit);
    })
    .catch(error => vscode.window.showErrorMessage(`Zap formatting failed: ${error.message}`));
}

function diagnosticMessage(diagnostic) {
  return String(diagnostic?.message || '').trim();
}

function quotedDiagnosticName(message) {
  const match = message.match(/["'`]([^"'`]+)["'`]/);
  return match ? match[1] : undefined;
}

function addImportCommand(uriString, suggestedName) {
  const uri = vscode.Uri.parse(uriString);
  const document = vscode.workspace.textDocuments.find(item => item.uri.toString() === uri.toString());
  if (!document) return;
  return vscode.window.showInputBox({
    prompt: 'Zap module path to import',
    value: suggestedName || '',
    placeHolder: 'app.core'
  }).then(modulePath => {
    if (!modulePath) return;
    const alias = modulePath.split('.').pop();
    const text = `import ${modulePath} as ${alias}\\n`;
    const edit = new vscode.WorkspaceEdit();
    edit.insert(uri, new vscode.Position(0, 0), text);
    return vscode.workspace.applyEdit(edit);
  });
}

function provideCodeActions(document, range, context) {
  const actions = [];
  for (const diagnostic of context.diagnostics || []) {
    const message = diagnosticMessage(diagnostic);
    const lower = message.toLowerCase();
    const name = quotedDiagnosticName(message);
    if (/(unresolved|unknown|cannot find|missing).*(import|module)|(import|module).*(not found|unresolved|missing)/i.test(message)) {
      const action = new vscode.CodeAction(`Add import for ${name || 'module'}`, vscode.CodeActionKind.QuickFix);
      action.diagnostics = [diagnostic];
      action.command = {
        command: 'zap.addImport',
        title: 'Add Zap import',
        arguments: [document.uri.toString(), name]
      };
      actions.push(action);
    }
    if (lower.includes('unused') && (lower.includes('variable') || lower.includes('binding') || lower.includes('declaration'))) {
      const line = diagnostic.range.start.line;
      const lineRange = document.lineAt(line).rangeIncludingLineBreak;
      const action = new vscode.CodeAction('Remove unused variable', vscode.CodeActionKind.QuickFix);
      action.diagnostics = [diagnostic];
      action.edit = new vscode.WorkspaceEdit();
      action.edit.delete(document.uri, lineRange);
      actions.push(action);
    }
    if (/(syntax|parse|unexpected|expected|invalid).*(error|token|syntax)?/i.test(message)) {
      const action = new vscode.CodeAction('Format Zap document', vscode.CodeActionKind.Source);
      action.diagnostics = [diagnostic];
      action.command = { command: 'editor.action.formatDocument', title: 'Format Zap document' };
      actions.push(action);
    }
  }
  return actions;
}

function runWorkspaceCommand(command, args, title) {
  const root = workspaceRoot();
  if (!root) {
    vscode.window.showInformationMessage(`Open a workspace before running Zap: ${title}.`);
    return;
  }
  runCli([command, ...args], root, (error, stdout, stderr) => {
    const channel = vscode.window.createOutputChannel('Zap');
    channel.clear();
    channel.appendLine(`$ ${executable()} ${command} ${args.join(' ')}`);
    channel.append(stdout || stderr || `Zap ${title} finished.`);
    channel.show(true);
    if (error) vscode.window.showErrorMessage(`Zap ${title} failed (exit ${error.code ?? 'unknown'}).`);
    else vscode.window.showInformationMessage(`Zap ${title} completed.`);
  });
}

function lintCurrentFile() {
  const document = currentZapDocument();
  if (document) runWorkspaceCommand('lint', [document.uri.fsPath], 'lint');
}

function buildWorkspace() {
  const root = workspaceRoot();
  if (root) runWorkspaceCommand('build', [root], 'build');
}

function testWorkspace() {
  const root = workspaceRoot();
  if (root) runWorkspaceCommand('test', [root], 'test');
}

function checkWorkspace() {
  const root = workspaceRoot();
  if (!root) {
    vscode.window.showInformationMessage('Open a Zap workspace before checking it.');
    return;
  }
  if (!fs.existsSync(path.join(root, 'zap.toml'))) {
    vscode.window.showInformationMessage('This folder is not a Zap project yet; create zap.toml before running workspace check.');
    return;
  }
  runCli(['check', '--json', root], root, (error, stdout, stderr) => {
    const items = parseJsonDiagnostic(stdout, stderr, root);
    if (!items.length) {
      diagnosticCollection.clear();
      vscode.window.showInformationMessage('Zap check passed.');
      return;
    }
    const editor = vscode.window.activeTextEditor;
    if (editor) refreshDiagnostics(editor.document);
    vscode.window.showErrorMessage(`Zap check found ${items.length} issue${items.length === 1 ? '' : 's'}.`);
  });
}

function lspDiagnostics(params) {
  if (!params.uri) return;
  const uri = vscode.Uri.parse(params.uri);
  const diagnostics = (params.diagnostics || []).map(item => {
    const start = item.range?.start || { line: 0, character: 0 };
    const end = item.range?.end || start;
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(start.line, start.character, end.line, end.character),
      item.message || 'Zap diagnostic',
      diagnosticSeverity(item.severity)
    );
    diagnostic.source = item.source || 'zap-lsp';
    return diagnostic;
  });
  diagnosticCollection.set(uri, diagnostics);
}

function startLsp(context) {
  if (!vscode.workspace.getConfiguration('zap').get('enableLsp', true)) return;
  const root = workspaceRoot();
  if (!root) return;
  try {
    lspClient = new ZapLspClient(executable(), root, lspDiagnostics, (code, stderr) => {
      if (code && stderr) vscode.window.setStatusBarMessage(`Zap LSP stopped: ${stderr.trim().slice(0, 120)}`, 5000);
    });
    context.subscriptions.push({ dispose: () => lspClient && lspClient.stop() });
  } catch (error) {
    vscode.window.showWarningMessage(`Zap LSP could not start: ${error.message}`);
  }
}

function activate(context) {
  context.subscriptions.push(diagnosticCollection);
  context.subscriptions.push(vscode.commands.registerCommand('zap.runFile', runCurrentFile));
  context.subscriptions.push(vscode.commands.registerCommand('zap.checkWorkspace', checkWorkspace));
  context.subscriptions.push(vscode.commands.registerCommand('zap.formatFile', formatCurrentFile));
  context.subscriptions.push(vscode.commands.registerCommand('zap.lintFile', lintCurrentFile));
  context.subscriptions.push(vscode.commands.registerCommand('zap.buildWorkspace', buildWorkspace));
  context.subscriptions.push(vscode.commands.registerCommand('zap.testWorkspace', testWorkspace));
  context.subscriptions.push(vscode.commands.registerCommand('zap.addImport', addImportCommand));
  context.subscriptions.push(vscode.commands.registerCommand('zap.restartDiagnostics', () => {
    diagnosticCollection.clear();
    const editor = vscode.window.activeTextEditor;
    if (editor) refreshDiagnostics(editor.document);
  }));
  context.subscriptions.push(vscode.commands.registerCommand('zap.restartLanguageServer', () => {
    restartLanguageServer(context);
  }));
  context.subscriptions.push(vscode.languages.registerCodeActionsProvider('zap', {
    provideCodeActions
  }, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix, vscode.CodeActionKind.Source] }));
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider('zap', {
    provideCompletionItems(document, position) {
      if (lspClient && lspClient.started) {
        return lspClient.request('textDocument/completion', {
          textDocument: { uri: document.uri.toString() },
          position: { line: position.line, character: position.character }
        }).then(result => (result?.items || []).map(toCompletionItem)).catch(() => localCompletions());
      }
      return localCompletions();
    }
  }, '.', ':'));
  context.subscriptions.push(vscode.languages.registerSignatureHelpProvider('zap', {
    provideSignatureHelp(document, position) {
      if (!lspClient || !lspClient.started) return undefined;
      return lspClient.request('textDocument/signatureHelp', {
        textDocument: { uri: document.uri.toString() },
        position: { line: position.line, character: position.character }
      }).then(result => {
        if (!result || !Array.isArray(result.signatures)) return undefined;
        const help = new vscode.SignatureHelp();
        help.activeSignature = result.activeSignature || 0;
        help.activeParameter = result.activeParameter || 0;
        help.signatures = result.signatures.map(signature => {
          const item = new vscode.SignatureInformation(signature.label || '');
          item.documentation = signature.documentation || '';
          item.parameters = (signature.parameters || []).map(parameter =>
            new vscode.ParameterInformation(parameter.label || String(parameter))
          );
          return item;
        });
        return help;
      }).catch(() => undefined);
    }
  }, '(', ','));
  context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider('zap', {
    provideDocumentFormattingEdits(document) {
      return formatEdits(document).catch(() => []);
    }
  }));
  context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(event => {
    if (event.document.languageId !== 'zap' || !vscode.workspace.getConfiguration('zap').get('formatOnSave', false)) return;
    event.waitUntil(formatEdits(event.document));
  }));
  context.subscriptions.push(vscode.languages.registerHoverProvider('zap', {
    provideHover(document, position) {
      if (!lspClient || !lspClient.started) return undefined;
      return lspClient.request('textDocument/hover', {
        textDocument: { uri: document.uri.toString() },
        position: { line: position.line, character: position.character }
      }).then(result => {
        if (!result || !result.contents) return undefined;
        const value = typeof result.contents === 'string' ? result.contents : result.contents.value;
        return value ? new vscode.Hover(new vscode.MarkdownString(value)) : undefined;
      }).catch(() => undefined);
    }
  }));
  context.subscriptions.push(vscode.languages.registerDefinitionProvider('zap', {
    provideDefinition(document, position) {
      if (!lspClient || !lspClient.started) return undefined;
      return lspClient.request('textDocument/definition', {
        textDocument: { uri: document.uri.toString() },
        position: { line: position.line, character: position.character }
      }).then(result => {
        if (!result) return undefined;
        const locations = Array.isArray(result) ? result : [result];
        return locations.map(location => new vscode.Location(
          vscode.Uri.parse(location.uri),
          new vscode.Range(
            location.range.start.line,
            location.range.start.character,
            location.range.end.line,
            location.range.end.character
          )
        ));
      }).catch(() => undefined);
    }
  }));
  context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider('zap', {
    provideWorkspaceSymbols(query) {
      if (!lspClient || !lspClient.started) return [];
      return lspClient.request('workspace/symbol', { query }).then(result => (result || []).map(symbol => new vscode.SymbolInformation(
        symbol.name,
        symbol.kind || vscode.SymbolKind.Namespace,
        new vscode.Range(
          symbol.location.range.start.line,
          symbol.location.range.start.character,
          symbol.location.range.end.line,
          symbol.location.range.end.character
        ),
        vscode.Uri.parse(symbol.location.uri),
        symbol.containerName
      ))).catch(() => []);
    }
  }));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
    if (event.document.languageId === 'zap') {
      if (lspClient) lspClient.change(event.document);
      scheduleDiagnostics(event.document);
    }
  }));
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => {
    if (document.languageId === 'zap') {
      if (lspClient) lspClient.open(document);
      refreshDiagnostics(document);
    }
  }));
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(document => {
    if (lspClient && document.languageId === 'zap') lspClient.close(document);
    diagnosticCollection.delete(document.uri);
  }));
  startLsp(context);
  for (const document of vscode.workspace.textDocuments) {
    if (document.languageId === 'zap' && lspClient) lspClient.open(document);
  }
  if (vscode.window.activeTextEditor?.document.languageId === 'zap') refreshDiagnostics(vscode.window.activeTextEditor.document);
}

function localCompletions() {
  const items = [];
  for (const word of KEYWORDS) items.push(item(word, vscode.CompletionItemKind.Keyword));
  for (const word of TYPES) items.push(item(word, vscode.CompletionItemKind.TypeParameter));
  for (const word of BUILTINS) items.push(item(word, vscode.CompletionItemKind.Function));
  return items;
}

function item(label, kind) {
  const completion = new vscode.CompletionItem(label, kind);
  completion.detail = 'Zap language';
  return completion;
}

function restartLanguageServer(context) {
  if (lspClient) lspClient.stop();
  lspClient = undefined;
  startLsp(context);
  for (const document of vscode.workspace.textDocuments) {
    if (document.languageId === 'zap' && lspClient) lspClient.open(document);
  }
  vscode.window.showInformationMessage('Zap Language Server restarted.');
}

function diagnosticSeverity(severity) {
  switch (severity) {
    case 1: return vscode.DiagnosticSeverity.Error;
    case 3: return vscode.DiagnosticSeverity.Information;
    case 4: return vscode.DiagnosticSeverity.Hint;
    default: return vscode.DiagnosticSeverity.Warning;
  }
}

function completionKind(kind) {
  const map = {
    1: vscode.CompletionItemKind.Text,
    2: vscode.CompletionItemKind.Method,
    3: vscode.CompletionItemKind.Function,
    4: vscode.CompletionItemKind.Constructor,
    5: vscode.CompletionItemKind.Field,
    6: vscode.CompletionItemKind.Variable,
    7: vscode.CompletionItemKind.Class,
    9: vscode.CompletionItemKind.Module,
    10: vscode.CompletionItemKind.Property,
    14: vscode.CompletionItemKind.Keyword,
    17: vscode.CompletionItemKind.Value,
    18: vscode.CompletionItemKind.Enum,
    19: vscode.CompletionItemKind.Interface,
    21: vscode.CompletionItemKind.Struct,
    22: vscode.CompletionItemKind.Event,
    25: vscode.CompletionItemKind.TypeParameter
  };
  return map[kind] || vscode.CompletionItemKind.Text;
}

function toCompletionItem(value) {
  const completion = item(value.label || value.insertText || '', completionKind(value.kind));
  completion.detail = value.detail || 'Zap LSP';
  if (value.documentation) completion.documentation = typeof value.documentation === 'string'
    ? new vscode.MarkdownString(value.documentation)
    : new vscode.MarkdownString(value.documentation.value || '');
  if (value.insertText) completion.insertText = value.insertText;
  if (value.sortText) completion.sortText = value.sortText;
  if (value.filterText) completion.filterText = value.filterText;
  return completion;
}

function deactivate() {
  clearTimeout(diagnosticTimer);
  if (lspClient) lspClient.stop();
  diagnosticCollection.dispose();
}

module.exports = { activate, deactivate, parseJsonDiagnostic, lspDiagnostics, completionKind };
