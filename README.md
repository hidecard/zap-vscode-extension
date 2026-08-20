# Zap Language Support for VS Code

![Zap logo](icons/zap-logo.png)

A VS Code extension for the [Zap programming language](https://github.com/hidecard/zap). It provides `.zp` language registration, TextMate syntax highlighting, snippets, native Zap LSP integration, diagnostics, formatting, and common Zap CLI workflows.

The extension intentionally does not bundle the Zap compiler or runtime. It uses the `zap` executable installed on the developer machine.

## Features

| Feature | Description |
| --- | --- |
| `.zp` language support | Registers `.zp` files as Zap source files. |
| Syntax highlighting | Highlights comments, strings, numbers, declarations, keywords, types, constants, operators, and built-in commands such as `say` and `print`. |
| Zap File Icons | Includes an optional `Zap File Icons` theme for `.zp` files in the Explorer. |
| LSP completion | Uses the native Zap LSP for workspace-aware completion and falls back to local keywords, types, and built-ins when the LSP is unavailable. |
| Signature help | Shows function signatures and active parameters while typing calls. |
| Hover and definitions | Provides hover information and Go to Definition through the Zap LSP. |
| Workspace symbols | Makes Zap declarations searchable from VS Code symbol search. |
| Formatting | Supports **Format Document** through `textDocument/formatting`. |
| Format on save | Optionally formats Zap documents when they are saved. |
| Diagnostics | Displays native LSP diagnostics and project diagnostics from `zap check --json`. |
| Snippets | Includes snippets for functions, loops, conditionals, imports, `try`/`catch`, `main`, and `raise`. |
| Run, lint, build, and test | Provides commands for the current file and the current Zap workspace. |

## Requirements

The extension requires:

1. [Visual Studio Code](https://code.visualstudio.com/) 1.85 or newer.
2. The Zap CLI installed and available as `zap` on `PATH`, or an explicit path configured through `zap.executable`.
3. A Zap project with `zap.toml` when using workspace-level check, build, or test commands.

A standalone `.zp` file can still use syntax highlighting and LSP features. Workspace diagnostics that require project metadata are skipped until a `zap.toml` file is present.

## Installation

### Install from a VSIX

Download the latest `.vsix` file from the repository, then open VS Code and run **Extensions: Install from VSIX...**. After installation, run **Developer: Reload Window** if the language mode or icon does not appear immediately.

### Build and install from source

```bash
git clone https://github.com/hidecard/zap-vscode-extension.git
cd zap-vscode-extension
npm ci
npm test
npm run package
```

The package is written to `dist/zap-language-support-0.3.0.vsix`. Install that file with **Extensions: Install from VSIX...**.

For development, use **Developer: Install Extension from Location...** and select the extension directory.

## File icon theme

The extension contributes a file icon theme named **Zap File Icons**. To show the Zap logo beside `.zp` files in the Explorer, open the Command Palette and choose **Preferences: File Icon Theme**, then select **Zap File Icons**.

VS Code does not allow an extension to silently replace the user's global file icon theme, so this selection is intentionally manual.

## Zap project setup

Workspace commands expect the workspace root to contain a `zap.toml` file. A minimal project manifest is:

```toml
[package]
name = "hello-zap"
version = "0.1.0"
main = "main.zp"
```

A matching `main.zp` file can contain:

```zap
let name: text = "Zap"
let port: number = 8080
let enabled: bool = true

say name
say port
say enabled
```

Zap blocks use indentation:

```zap
fn greet(name: text = "World") -> text:
    return "Hello, " + name

if enabled:
    say greet(name)
else:
    say "Disabled"
```

The Zap language uses `.zp` source files. Common language constructs include `let`, typed annotations, `fn`, `if`/`else`, `for`, `while`, `async`/`await`, `class`, `module`, `import`, `try`/`catch`, `raise`, lists, maps, and Result/Option values. See the [Zap syntax guide](https://github.com/hidecard/zap/blob/main/docs/SYNTAX_GUIDE_EN.md) for the complete language reference.

## Commands

The following commands are available from the Command Palette:

| Command | Purpose |
| --- | --- |
| **Zap: Run Current File** | Runs the active file with `zap run <file>`. |
| **Zap: Check Workspace** | Runs `zap check --json <workspace>`. Requires `zap.toml`. |
| **Zap: Restart Diagnostics** | Clears and refreshes the current diagnostics. |
| **Zap: Format Current File** | Requests formatting edits from the Zap LSP. |
| **Zap: Lint Current File** | Runs `zap lint <file>`. |
| **Zap: Build Workspace** | Runs `zap build <workspace>`. |
| **Zap: Test Workspace** | Runs `zap test <workspace>`. |

The Run command uses the integrated terminal by default. Disable `zap.runInTerminal` to send command output to the Zap Output channel instead.

## Settings

```json
{
  "zap.executable": "zap",
  "zap.enableLsp": true,
  "zap.enableDiagnostics": true,
  "zap.diagnosticDelay": 350,
  "zap.runInTerminal": true,
  "zap.formatOnSave": false
}
```

| Setting | Default | Description |
| --- | --- | --- |
| `zap.executable` | `"zap"` | Zap CLI command or absolute executable path. |
| `zap.enableLsp` | `true` | Starts the native `zap lsp` stdio server. |
| `zap.enableDiagnostics` | `true` | Enables project diagnostics from `zap check --json`. |
| `zap.diagnosticDelay` | `350` | Debounce delay in milliseconds for CLI diagnostics after edits. |
| `zap.runInTerminal` | `true` | Runs files in the integrated terminal instead of the Output channel. |
| `zap.formatOnSave` | `false` | Applies LSP formatting edits before saving Zap files. |

## LSP integration

The extension starts `zap lsp` as a stdio JSON-RPC server and synchronizes opened, changed, and closed `.zp` documents. It currently uses the following LSP capabilities:

- `initialize` and graceful shutdown.
- `textDocument/didOpen`, `didChange`, and `didClose`.
- `textDocument/completion`.
- `textDocument/signatureHelp`.
- `textDocument/hover`.
- `textDocument/definition`.
- `textDocument/formatting`.
- `workspace/symbol`.
- `textDocument/publishDiagnostics`.

References, symbol rename, code actions, semantic tokens, and document symbols are not exposed until the native Zap LSP implements the corresponding protocol methods.

## Development and validation

Install dependencies and run the extension checks:

```bash
npm ci
npm test
npm run package
```

The validation script checks the package manifest, icon theme, grammar, snippets, extension JavaScript, and LSP integration. The packaging script uses the official VS Code extension packager and writes a real `.vsix` package under `dist/`.

## Repository links

- [Zap language repository](https://github.com/hidecard/zap)
- [Zap VS Code extension repository](https://github.com/hidecard/zap-vscode-extension)
- [Zap syntax guide](https://github.com/hidecard/zap/blob/main/docs/SYNTAX_GUIDE_EN.md)
- [Zap LSP implementation](https://github.com/hidecard/zap/blob/main/native/src/lsp.rs)

## License

This extension is distributed under the MIT License. See [LICENSE](LICENSE).
