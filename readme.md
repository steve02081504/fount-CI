# fount-CI

A Composite GitHub Action that runs fount characters with a real OpenAI-compatible API to perform engineering tasks in CI.

## Quick start

Add these repository secrets (Settings → Secrets):

| Secret            | Description                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `OPENAI_BASE_URL` | Full OpenAI-compatible chat completions URL (e.g. `https://api.openai.com/v1/chat/completions`) |
| `OPENAI_API_KEY`  | API key                                                                                         |
| `OPENAI_MODEL`    | Model name (e.g. `gpt-4o`)                                                                      |

```yaml
permissions:
  contents: write # required for the built-in push step after success
  actions: write # required for cache delete via github-token

jobs:
  ai-task:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: steve02081504/fount-CI@master
        with:
          task: |
            Fix spelling mistakes in README.
          max-steps: '200'
          max-time-seconds: '1800'
        env:
          OPENAI_BASE_URL: ${{ secrets.OPENAI_BASE_URL }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          OPENAI_MODEL: ${{ secrets.OPENAI_MODEL }}
```

Checkout your repository before this action (e.g. `actions/checkout@v4`). The agent runs in `GITHUB_WORKSPACE` and edits files via code-execution and file-operations plugins. On success, when `no-push` is `false` and the ref is not a tag, it runs `git pull --rebase --autostash` then commits and pushes via [actions-go/push](https://github.com/actions-go/push).

## Inputs

| Input              | Required | Default                         | Description                                                                                                                                                     |
| ------------------ | -------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task`             | yes      | —                               | What the AI should do                                                                                                                                           |
| `char-path`        | no       | empty                           | Character folder in the consumer repo to **load**; empty uses builtin `fount-CI-agent`                                                                          |
| `char-config-path` | no       | `default_data/char-config.json` | JSON passed to `SetData` **after** load (not the character folder); resolves from the consumer repo first, then the action package; supports `${}` placeholders |
| `aisource-path`    | no       | empty                           | Custom AI source folder in the consumer repo                                                                                                                    |
| `max-steps`        | no       | empty                           | Max `chat_log` length; empty means unlimited                                                                                                                    |
| `max-time-seconds` | no       | empty                           | Max runtime in seconds; empty means unlimited                                                                                                                   |
| `CI-username`      | no       | `CI-user`                       | fount virtual username                                                                                                                                          |
| `github-token`     | no       | `${{ github.token }}`           | GitHub token for cache management (delete/save `node_modules` and Deno caches)                                                                                  |
| `fount-ref`        | no       | `master`                        | fount branch to clone                                                                                                                                           |
| `no-push`          | no       | `false`                         | Set `true` to skip commit/push after success                                                                                                                    |
| `commit-message`   | no       | `files update~`                 | Commit message for push                                                                                                                                         |
| `committer-email`  | no       | `taromati2@outlook.com`         | Git author email                                                                                                                                                |
| `committer-name`   | no       | `Taromati2`                     | Git author name                                                                                                                                                 |
| `token`            | no       | `${{ github.token }}`           | Token used for push                                                                                                                                             |

## Outputs

| Output       | Description                                     |
| ------------ | ----------------------------------------------- |
| `status`     | `success` / `failure` / `timeout` / `max-steps` |
| `reason`     | Exit reason                                     |
| `steps-used` | Final `chat_log.length`                         |

## Built-in parts

- **Character** `fount-CI-agent`: simplified ZL-31 with `code-execution` + `file-operations` only
- **AI source** `fount-CI`: proxy generator; url, apikey, model from secrets
- **Plugin** `CI-settlement`: agent exits with `<CI-exit status="success|failure" reason="..."/>`

### Character load vs SetData

1. **`char-path`** — which character `loadPart` loads (builtin or a folder in your repo).
2. **`char-config-path`** — JSON read after load and passed to `char.interfaces.config.SetData(...)` to bind the AI source and plugins. Unrelated to where the character files live. The path is resolved against `GITHUB_WORKSPACE` first; if the file is missing there, the action falls back to the same path inside the action package.

Default SetData template [`default_data/char-config.json`](default_data/char-config.json):

```json
{
  "AIsource": "${AIsource}",
  "plugins": ["code-execution", "file-operations", "${CIPlugin}"]
}
```

Placeholders: `${AIsource}`, `${CIPlugin}`, `${charname}`, `${username}`.

### Step and time limits

Both are checked in the `CI-settlement` plugin `GetPrompt` (on every `buildPromptStruct` call, including tool regen loops).

| Limit              | Condition                     | On exceed                             |
| ------------------ | ----------------------------- | ------------------------------------- |
| `max-steps`        | `chat_log.length > max-steps` | `status=max-steps`, `process.exit(1)` |
| `max-time-seconds` | elapsed seconds > limit       | `status=timeout`, `process.exit(1)`   |

The plugin prompt shows remaining steps and remaining seconds. Tool log entries count toward step length. Commit/push runs only when `outputs.status` is `success`.

Each agent round logs a collapsible `::group::` block to the console (tools, reply, exit signal) and an **Agent steps** section in `GITHUB_STEP_SUMMARY`.

## Local debugging

```bash
export FOUNT_CI_TASK="List files in the current directory"
export OPENAI_BASE_URL="https://api.openai.com/v1/chat/completions"
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4o"
export GITHUB_WORKSPACE="$(pwd)"
# optional — same env vars the action passes to index.mjs
# export FOUNT_CI_CHAR_CONFIG_PATH="default_data/char-config.json"
# export FOUNT_CI_MAX_STEPS="200"
# export FOUNT_CI_MAX_TIME_SECONDS="1800"

./run.sh
```

Requires [fount](https://github.com/steve02081504/fount) and Deno.

## Security

This action runs AI-generated code on the runner and reads/writes repo files. It also calls external AI APIs (cost applies). Use only on trusted repos and branches, with sensible `max-steps` and `max-time-seconds`.
