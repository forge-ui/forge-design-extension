---
name: forge-design
description: Use when editing or inspecting a web app in the user's real Chrome through Forge Design. Triggers include pick-to-edit, last-pick, page screenshot, selector, layout, copy, and local Grok driving the current page. Do not use for social-account ops or general web scraping.
---

# Forge Design

Forge Design is a local design tool. The user picks a component in Chrome, or places a Forge block onto the page; you change that UI with their local Grok.

Use `scripts/bridge.sh` only when you need the live page (last pick, last place, snapshot, click). Prefer the side panel pick or place over guessing selectors.

## When to use the bridge

- The user selected something with **选择元素** or **截图标注**, placed a block from the component palette, or asks to change a specific component on the current page.
- You need the current URL, title, last-pick selector, last-place target, or a page snapshot to understand the UI.
- Do not treat this as a generic browser agent. Do not automate posting, following, shopping, or account changes.

## Workflow

1. Run `scripts/bridge.sh health`. If `extensionConnected` is false, ask the user to start the local bridge or reload the extension.
2. Run `scripts/bridge.sh last-place`. If `places` has 2+ items (or `place` exists) and `placedAt` is within the last 30 minutes, the user confirmed 写入源码. Write **all** numbered components in that order in one pass; do not only write the first. Prefer this over last-pick. Do not write source from a page preview that was cancelled.
3. Otherwise run `scripts/bridge.sh last-pick`. If `pick` exists and `pickedAt` is within the last 30 minutes, that is the target. Use `selector`, `text`, `url`, and `testid`.
4. If there is no recent pick or place, ask the user to click **选择元素** or **截图标注**, or the **+** palette, then read again. You may `scripts/bridge.sh snapshot 80` on the current page when they already said to inspect it. If the prompt includes `annotated screenshot`, follow the red boxes / arrows / pen marks / written labels instead of guessing a selector.
5. Prefer stable `id`, `data-testid`, `aria-label`, or role selectors.
6. After writing placed components, snapshot again before claiming it worked. For a numbered multi-place, write the whole batch in one pass.

## Placing a Forge block

- Import from `@forge-ui-official/core` only. Do not hand-roll an equivalent.
- If cwd is a local Forge / Next app, write real source next to the anchors. Do not only mutate the live DOM.
- If the current Chrome page is not that app, say so. Do not claim the live page changed.
- Ignore the in-page replicas. They are plugin overlays, not source. Only write source after the user confirms 写入源码.
- If several placements are numbered `#1` `#2` `#3`, those numbers match the on-page replicas. Insert every item in that index order in a single edit.
- `relative to: #N` means this block is attached to placement `#N`, not to a new page region. Recreate that spatial relationship.
- `position: inside` means nest into that host. For a table, write cell content (`CellText` or the placed component) into that row/column. Do not emit a sibling under the table.
- `position: left` / `right` means a sibling on that side of the anchor or previous placement (same row, flex). `before` / `after` means above / below.
- Follow the 版式 map. Do not flatten a row into a column. Do not invent a different layout than the numbered previews.

## Interaction

- `click <selector>` moves the visible cursor, then clicks. Do not call `.click()` through `eval`.
- `fill <selector> <text>` replaces field contents.
- `type <text>` only when the field is already focused.
- Confirm before send, publish, purchase, delete, or permission changes.

## Safety

- Never print `.bridge-state.json`, `BRIDGE_TOKEN`, cookies, passwords, or page secrets.
- The bridge listens on `127.0.0.1` only. Token stays on this machine.
- Keep automation on the dedicated agent tab unless the user asks for the active tab.
- Do not pass `focus`, `foreground`, or `useActive` unless the user asked to take over their current tab. Those steal keyboard and window focus.

## Commands

Read [references/commands.md](references/commands.md) only when you need syntax.
