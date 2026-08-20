# Zap VS Code Extension

ဤ extension သည် Zap ၏ `.zp` source file များကို VS Code တွင် တိုက်ရိုက်ရေးသားနိုင်ရန် အထောက်အကူပြုပါသည်။ Zap CLI ကို အသုံးပြုပြီး syntax highlighting၊ autocomplete၊ diagnostics နှင့် run command များကို ပေါင်းစပ်ထားပါသည်။

## ပါဝင်သောအင်္ဂါရပ်များ

| အင်္ဂါရပ် | ရှင်းလင်းချက် |
| --- | --- |
| `.zp` language support | `.zp` file များကို Zap source file အဖြစ် မှတ်ပုံတင်ခြင်း |
| Syntax highlighting | comment၊ string၊ number၊ declaration၊ keyword၊ type၊ constant၊ operator နှင့် `say`/`print` ကဲ့သို့ built-in command များကို highlight ပြခြင်း |
| Zap File Icons | Explorer ထဲရှိ `.zp` file များအတွက် `Zap File Icons` theme အသုံးပြုနိုင်ခြင်း |
| LSP completion | Native Zap LSP ၏ CompletionItem များကို rich mapping ဖြင့်အသုံးပြုပြီး LSP မရလျှင် Zap keyword၊ type နှင့် native stdlib builtin catalog များဖြင့် fallback လုပ်ခြင်း |
| Signature help | Function call ရေးနေစဉ် function signature နှင့် လက်ရှိ parameter ကို ပြခြင်း |
| Hover နှင့် definition | Hover information နှင့် Go to Definition ကို Zap LSP ဖြင့် အသုံးပြုနိုင်ခြင်း |
| Workspace symbols | VS Code symbol search မှ Zap declaration များကို ရှာဖွေနိုင်ခြင်း |
| Formatting | **Format Document** နှင့် **Zap: Format Current File** ကို LSP မှတစ်ဆင့် အသုံးပြုနိုင်ခြင်း |
| Format on save | Save လုပ်ချိန်တွင် Zap file ကို အလိုအလျောက် format လုပ်နိုင်ခြင်း |
| Diagnostics | Native LSP diagnostics နှင့် `zap check --json` project diagnostics များကို Problems panel တွင် ပြခြင်း |
| Snippets | function၊ loop၊ condition၊ import၊ `try/catch`၊ `main` နှင့် `raise` snippets များ |
| Run၊ lint၊ build၊ test | လက်ရှိ file နှင့် Zap workspace အတွက် command များကို Command Palette မှ run ခြင်း |

## လိုအပ်ချက်များ

Extension အသုံးပြုရန် VS Code 1.85 သို့မဟုတ် အထက်နှင့် Zap CLI လိုအပ်ပါသည်။ Zap CLI ကို `PATH` ထဲတွင် `zap` အမည်ဖြင့် ထည့်ထားပါ သို့မဟုတ် VS Code Settings တွင် `zap.executable` ကို executable လမ်းကြောင်းအဖြစ် သတ်မှတ်ပါ။ Workspace-level check၊ build နှင့် test command များအတွက် project root ထဲတွင် `zap.toml` ရှိရပါမည်။

Standalone `.zp` file များအတွက် syntax highlighting နှင့် LSP feature များကို ဆက်လက်အသုံးပြုနိုင်ပါသည်။ `zap.toml` မရှိသေးလျှင် project metadata လိုအပ်သော workspace diagnostics များကို မ run ပါ။

## Installation

### VSIX ဖြင့် Install လုပ်ခြင်း

`.vsix` file ကို download လုပ်ပြီး VS Code တွင် **Extensions: Install from VSIX...** ကို run ပါ။ Install ပြီးနောက် language mode သို့မဟုတ် icon မပေါ်သေးလျှင် **Developer: Reload Window** ကို run ပါ။

### Source မှ Build လုပ်ခြင်း

```bash
git clone https://github.com/hidecard/zap-vscode-extension.git
cd zap-vscode-extension
npm ci
npm test
npm run package
```

Package ဖိုင်သည် `dist/zap-language-support-0.5.0.vsix` တွင် ထွက်လာပါမည်။ ထိုဖိုင်ကို **Extensions: Install from VSIX...** ဖြင့် install လုပ်ပါ။ Development အတွက် **Developer: Install Extension from Location...** ကို run ပြီး extension directory ကို ရွေးပါ။

## `.zp` File Icon ပြရန်

Command Palette ကိုဖွင့်ပြီး **Preferences: File Icon Theme** ကို ရွေးကာ **Zap File Icons** ကို ရွေးပါ။ VS Code သည် extension တစ်ခုက user ၏ global file icon theme ကို အလိုအလျောက် အစားထိုးခြင်းကို ခွင့်မပြုသောကြောင့် ဤရွေးချယ်မှုကို ကိုယ်တိုင်လုပ်ရပါသည်။

## Zap Project ပြင်ဆင်ခြင်း

Workspace command များအတွက် workspace root ထဲတွင် `zap.toml` ရှိရပါမည်။ အနည်းဆုံး project manifest ဥပမာမှာ—

```toml
[package]
name = "hello-zap"
version = "0.1.0"
main = "main.zp"
```

`main.zp` ဥပမာ—

```zap
let name: text = "Zap"
let port: number = 8080
let enabled: bool = true

say name
say port
say enabled
```

Zap block များသည် indentation ကို အသုံးပြုပါသည်။

```zap
fn greet(name: text = "World") -> text:
    return "Hello, " + name

if enabled:
    say greet(name)
else:
    say "Disabled"
```

Zap language တွင် `let`၊ typed annotation၊ `fn`၊ `if`/`else`၊ `for`၊ `while`၊ `async`/`await`၊ `class`၊ `module`၊ `import`၊ `try`/`catch`၊ `raise`၊ list၊ map နှင့် Result/Option value များကို အသုံးပြုနိုင်ပါသည်။ အပြည့်အစုံကို [Zap syntax guide](https://github.com/hidecard/zap/blob/main/docs/SYNTAX_GUIDE_MM.md) တွင် ဖတ်ရှုနိုင်ပါသည်။

## Commands

| Command | လုပ်ဆောင်ချက် |
| --- | --- |
| **Zap: Run Current File** | Active file ကို `zap run <file>` ဖြင့် run ပါသည်။ |
| **Zap: Check Workspace** | `zap check --json <workspace>` ဖြင့် စစ်ဆေးပါသည်။ `zap.toml` လိုအပ်ပါသည်။ |
| **Zap: Restart Diagnostics** | Diagnostics များကို ဖျက်ပြီး ပြန် refresh လုပ်ပါသည်။ |
| **Zap: Restart Language Server** | Native Zap LSP ကို ရပ်ပြီး ပြန်စတင်ကာ ဖွင့်ထားသည့် `.zp` files များကို ပြန်ချိတ်ပါသည်။ |
| **Zap: Format Current File** | Zap LSP ထံမှ formatting edits ရယူပြီး apply လုပ်ပါသည်။ |
| **Zap: Lint Current File** | `zap lint <file>` ကို run ပါသည်။ |
| **Zap: Build Workspace** | `zap build <workspace>` ကို run ပါသည်။ |
| **Zap: Test Workspace** | `zap test <workspace>` ကို run ပါသည်။ |

`Zap: Run Current File` သည် default အနေဖြင့် integrated terminal ကို အသုံးပြုပါသည်။ Output Channel သို့ ပို့လိုပါက `zap.runInTerminal` ကို `false` သတ်မှတ်ပါ။

## Settings

```json
{
  "zap.executable": "zap",
  "zap.enableLsp": true,
  "zap.enableDiagnostics": true,
  "zap.diagnosticDelay": 350,
  "zap.runInTerminal": true,
  "zap.formatOnSave": false,
  "zap.lspRequestTimeout": 10000
}
```

| Setting | Default | ဖော်ပြချက် |
| --- | --- | --- |
| `zap.executable` | `"zap"` | Zap CLI command သို့မဟုတ် executable လမ်းကြောင်း |
| `zap.enableLsp` | `true` | Native `zap lsp` stdio server ကို စတင်ခြင်း |
| `zap.enableDiagnostics` | `true` | `zap check --json` project diagnostics ကို ဖွင့်ခြင်း |
| `zap.diagnosticDelay` | `350` | Edit ပြီးနောက် diagnostics ပြန်စစ်မည့် debounce delay ကို milliseconds ဖြင့် သတ်မှတ်ခြင်း |
| `zap.runInTerminal` | `true` | File run output ကို integrated terminal သို့ ပို့ခြင်း |
| `zap.formatOnSave` | `false` | Zap file save မလုပ်မီ LSP formatting edits များကို apply လုပ်ခြင်း |
| `zap.lspRequestTimeout` | `10000` | Native LSP request တစ်ခုအတွက် စောင့်မည့်အများဆုံး milliseconds |

## LSP Integration

Extension သည် `zap lsp` ကို stdio JSON-RPC server အဖြစ် စတင်ပြီး ဖွင့်ထားသော၊ ပြောင်းလဲထားသော၊ ပိတ်လိုက်သော `.zp` document များကို server နှင့် synchronize လုပ်ပါသည်။ လက်ရှိအသုံးပြုသည့် capability များမှာ `initialize`၊ `textDocument/didOpen`၊ `didChange`၊ `didClose`၊ `completion`၊ `signatureHelp`၊ `hover`၊ `definition`၊ `formatting`၊ `workspace/symbol` နှင့် `publishDiagnostics` တို့ ဖြစ်ပါသည်။

Extension တွင် **Zap: Restart Language Server** command နှင့် LSP request timeout ပါဝင်သောကြောင့် server တုံ့ပြန်မှုရပ်နေသည့်အခါ completion/hover request များ pending အဖြစ် မကျန်တော့ပါ။ Native Zap LSP တွင် သက်ဆိုင်ရာ protocol method များ မထည့်သေးသရွေ့ References၊ Symbol Rename၊ Code Actions၊ Semantic Tokens နှင့် Document Symbols များကို extension မှ မဖော်ပြနိုင်သေးပါ။

## Development နှင့် Validation

```bash
npm ci
npm test
npm run package
```

Validation script သည် package manifest၊ icon theme၊ grammar၊ snippets၊ extension JavaScript နှင့် LSP integration များကို စစ်ဆေးပါသည်။ Packaging script သည် official VS Code extension packager ကို အသုံးပြုပြီး `dist/` အောက်တွင် တကယ့် `.vsix` package ထုတ်ပေးပါသည်။

## Repository Links

- [Zap language repository](https://github.com/hidecard/zap)
- [Zap VS Code extension repository](https://github.com/hidecard/zap-vscode-extension)
- [Zap syntax guide](https://github.com/hidecard/zap/blob/main/docs/SYNTAX_GUIDE_MM.md)
- [Zap LSP implementation](https://github.com/hidecard/zap/blob/main/native/src/lsp.rs)

## License

ဤ extension ကို MIT License ဖြင့် ဖြန့်ဝေပါသည်။ [LICENSE](LICENSE) ကို ကြည့်ပါ။
