# Command reference

Run all commands through `scripts/bridge.sh`.

```text
health
status
tabs
url
title
goto <url>
newtab [url]
activate <tabId>
reload
text
snapshot [limit]
click <selector>
focus <selector>
fill <selector> <text...>
type <text...>
press <key>
wait <selector>
exists <selector>
scroll [y]
eval <expression>
last-pick
start-pick
raw <json>
```

## Raw examples

Scroll an element into view:

```sh
scripts/bridge.sh raw '{"command":"scroll","args":{"selector":"button[data-testid=save]","block":"center"}}'
```

Wait for a URL change:

```sh
scripts/bridge.sh raw '{"command":"wait","args":{"urlIncludes":"/success","timeoutMs":15000}}'
```

Read the element the user last pointed at in the extension picker:

```sh
scripts/bridge.sh last-pick
```

Wait for the user to pick an element on the current page (up to 90s):

```sh
scripts/bridge.sh start-pick
```

Use the active user tab only when explicitly requested:

```sh
scripts/bridge.sh raw '{"command":"snapshot","args":{"useActive":true,"limit":80}}'
```

Do not use `eval` to click, fill, navigate, fetch, open sockets, or access secrets.
