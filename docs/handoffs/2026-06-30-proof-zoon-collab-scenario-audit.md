# Proof/Zoon Collaboration Alignment

Decision: Zoon collaboration behavior should match Proof for the 12 user-facing
scenarios below. Zoon-specific confirmation/source-tracking protections were
removed from the core contract.

| # | Scenario | Proof-aligned behavior |
|---|---|---|
| 1 | Reading/source marks | Use the same mark data and decoration behavior as Proof. |
| 2 | Add comment | `comment.add` creates a new anchored comment. |
| 3 | Reply comment | `comment.reply` replies to an existing comment by `markId`. |
| 4 | Agent direct replace block | `/edit/v2 replace_block` applies when base preconditions pass, even on marked blocks. |
| 5 | Agent replies to comment with rewrite | Agent may reply to the thread and then use direct edit or suggestion according to intent. |
| 6 | Pending replace suggestion | `suggestion.add` defaults to `status:"pending"`. |
| 7 | Confirm replace | `suggestion.accept` applies the replacement through Proof rehydration and live convergence checks. |
| 8 | Reject suggestion | `suggestion.reject` removes/finalizes the suggestion without changing document正文. |
| 9 | Resolve comment | `comment.resolve` only resolves the comment thread. |
| 10 | Comment + suggestion same range | Overlap is allowed; no Zoon-only anchor protection blocks direct edit. |
| 11 | Sync not ready / multi online | Use Proof projection/readiness and collab convergence behavior. |
| 12 | Old comment anchors | Missing required mark hydration follows Proof failure behavior. |

Removed Zoon-specific rules:

- `sourceMarkId` / `sourceCommentId` tracking fields.
- `CONFIRMATION_REQUIRED` for AI accepted suggestions.
- `COLLAB_ANCHOR_PROTECTED` on `/edit/v2`.
- Frontend `markAcceptAsync` / `markRejectAsync` waiting UI.
- `contentMode:"block_markdown"` replacement branch.
- Stale comment anchors bypass during suggestion rehydration.
- Ref-free `insert_at_end` / `insert_at_start` edit-v2 entrypoints.
