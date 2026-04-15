# Zoon Agent Quick Reference

Base: `http://<host>/documents/<slug>`  Auth: `Authorization: Bearer <token>`

## Read

```
GET /documents/<slug>/state            # full state + marks + _links
GET /documents/<slug>/snapshot         # blocks array for v2 edits
```

## Edit (prefer v2)

```
POST /documents/<slug>/edit/v2
{"by":"ai:x","baseRevision":N,"operations":[
  {"op":"replace_block","ref":"b3","block":{"markdown":"new text"}},
  {"op":"insert_after","ref":"b3","blocks":[{"markdown":"## New"}]}
]}
```

## Ops (comments / suggestions / rewrite)

```
POST /documents/<slug>/ops
```

| type | required fields | notes |
|------|----------------|-------|
| `comment.add` | `by`, `quote`, `text` | creates NEW thread |
| `comment.reply` | `by`, `markId`, `text` | reply to existing thread |
| `suggestion.add` | `by`, `kind`, `quote`, `content` | kind: replace/insert/delete |
| `rewrite.apply` | `by`, `content` | replaces whole doc |

**To reply to a thread**: use `comment.reply` + `markId` (from state marks).  
Do NOT use `comment.add` + `threadId` — that creates a new comment and requires `quote`.

## Multi-line text

Escape newlines as `\n` in JSON. Use Python for complex payloads:

```python
import json, urllib.request
body = json.dumps({"type":"comment.add","by":"ai:x","quote":"anchor","text":"line1\nline2"})
req = urllib.request.Request("http://<host>/documents/<slug>/ops?token=<token>",
  data=body.encode(), headers={"Content-Type":"application/json"})
print(urllib.request.urlopen(req).read().decode())
```

## Common errors

| code | cause | fix |
|------|-------|-----|
| `ANCHOR_NOT_FOUND` | quote not in doc | re-read state, use exact substring |
| `STALE_REVISION` | concurrent edit | re-fetch snapshot, retry |
| `LIVE_CLIENTS_PRESENT` | rewrite blocked | use edit/v2 instead |

Full docs: `GET /agent-docs`
