# CLI Integration Guide

This project supports integration with multiple AI CLI tools, allowing you to interact with them directly through the Chat Interface. Currently supported CLIs are:

- **Claude Code** (via SDK)
- **Cursor** (via `cursor-agent` or CLI)
- **iFlow** (`iflow`)
- **Crush** (`crush`)

## Prerequisites

- **Node.js**: Ensure you have Node.js installed (v18+ recommended).
- **System PATH**: The CLI tools you wish to use must be installed and accessible in your system's `PATH`. The application spawns these tools directly.

## 1. iFlow CLI Integration

**iFlow** is an AI assistant that operates within your terminal.

### Installation

Please refer to the official [iFlow CLI repository](https://github.com/iflow-ai/iflow-cli) for the most up-to-date installation instructions. Typically, it can be installed via npm or a standalone binary.

```bash
# Example (verify with official docs):
npm install -g @iflow/cli
# OR
npm install -g iflow-cli
```

### Verification

Ensure `iflow` is in your PATH by running:

```bash
iflow --version
```

### Configuration

The application assumes `iflow` can be run non-interactively or accepts prompts via arguments (e.g., `-p "prompt"`). Ensure you have authenticated `iflow` if required (usually via `iflow login` or setting an API key).

## 2. Crush CLI Integration

**Crush** is a glamorous AI coding agent for the terminal by Charmbracelet.

### Installation

You can install Crush using various package managers or Go.

**macOS / Linux (Homebrew):**
```bash
brew install charmbracelet/tap/crush
```

**Windows (Winget):**
```bash
winget install charmbracelet.crush
```

**Go:**
```bash
go install github.com/charmbracelet/crush@latest
```

### Configuration

Crush requires an LLM provider. You typically configure this via environment variables or a configuration file.

**Environment Variables:**
Set your API key for your preferred provider (e.g., OpenAI, Anthropic).

```bash
export OPENAI_API_KEY="sk-..."
# or
export ANTHROPIC_API_KEY="sk-ant-..."
```

Ensure these variables are set in the environment where you launch the `claudecodeui` server, or configure them globally.

### Verification

Ensure `crush` is in your PATH:

```bash
crush --version
```

## Usage in Chat Interface

1.  **Launch the Application**: Start the `claudecodeui` server and frontend.
2.  **Select Provider**: In the "Choose Your AI Assistant" screen (or the provider selector in the chat), click on **iFlow** or **Crush**.
3.  **Chat**: Type your message and send. The application will spawn the selected CLI process, pass your prompt, and stream the output back to the chat window.

## Troubleshooting

-   **"Command not found"**: If you see errors related to spawning the process, ensure the CLI tool is installed and in your system's `PATH`. You may need to restart the server after installing a new CLI.
-   **No Output**: Ensure the CLI tool is configured correctly (e.g., valid API keys) and works when run directly in your terminal.
-   **Authentication Errors**: If the CLI requires login, run the login command in your terminal before using it in the web interface.
