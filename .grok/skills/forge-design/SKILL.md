---
name: forge-design
description: Use when editing or inspecting a web app in the user's real Chrome through Forge Design. Triggers include pick-to-edit, last-pick, page screenshot, selector, layout, copy, and local Grok driving the current page. Do not use for social-account ops or general web scraping.
---

# Forge Design

Forge Design is a local design tool. The user picks a component in Chrome; you change that UI with their local Grok.

Use `scripts/bridge.sh` only when you need the live page (last pick, snapshot, click). Prefer the side panel pick over guessing selectors.

## When to use the bridge

- The user selected something with **选择以编辑**, or asks to change a specific component on the current page.
- You need the current URL, title, last-pick selector, or a page snapshot to understand the UI.
- Do not treat this as a generic browser agent. Do not automate posting, following, shopping, or account changes.

## Workflow

1. Run `scripts/bridge.sh health`. If `extensionConnected` is false, ask the user to start the local bridge or reload the extension.
2. Run `scripts/bridge.sh last-pick`. If `pick` exists and `pickedAt` is within the last 30 minutes, that is the target. Use `selector`, `text`, `url`, and `testid`.
3. If there is no recent pick, ask the user to click **选择以编辑**, then read `last-pick` again. You may `scripts/bridge.sh snapshot 80` on the current page when they already said to inspect it.
4. Prefer stable `id`, `data-testid`, `aria-label`, or role selectors.
5. Change one visible thing at a time. After navigation or a submit, snapshot again before claiming it worked.

## Interaction

- `click <selector>` moves the visible cursor, then clicks. Do not call `.click()` through `eval`.
- `fill <selector> <text>` replaces field contents.
- `type <text>` only when the field is already focused.
- Confirm before send, publish, purchase, delete, or permission changes.

## Safety

- Never print `.bridge-state.json`, `BRIDGE_TOKEN`, cookies, passwords, or page secrets.
- The bridge listens on `127.0.0.1` only. Token stays on this machine.
- Keep automation on the dedicated agent tab unless the user asks for the active tab.

## Commands

Read [references/commands.md](references/commands.md) only when you need syntax.
