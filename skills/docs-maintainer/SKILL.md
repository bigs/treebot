---
name: docs-maintainer
description: Maintain and update project documentation in docs/ after application changes. Use when a new feature is added, a feature is deleted, or expected behavior changes and the code work has been completed with a commit; perform a follow-up documentation update in a new commit.
---

# Docs Maintainer

## Overview

Keep `docs/` accurate after substantial code changes by updating, adding, or removing documentation in a separate, follow-up commit.

## Workflow (run after the feature commit)

1. Identify the behavior changes introduced by the feature commit (new behavior, removed behavior, or changed behavior).
2. Search `docs/` for impacted material (use `rg -n "<keyword>" docs`).
3. Update documentation to match the new behavior:
   - Add new module files when a new user-facing feature, API route, or data model is added.
   - Update existing module sections when behavior, data shape, or flows change.
   - Delete docs for removed features and remove links from the index.
4. Update the index and navigation:
   - `docs/README.md` must link to any new docs and remove links to deleted docs.
   - Update `docs/architecture/site-map.md` for route changes.
   - Update `docs/api/routes.md` for API route changes.
   - Update `docs/data/data-models.md` for schema changes.
5. Validate internal links in `docs/`:

```bash
python3 - <<'PY'
import os, re
root = "docs"
missing = []
link_re = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
for dirpath, _, filenames in os.walk(root):
    for fn in filenames:
        if not fn.endswith(".md"):
            continue
        path = os.path.join(dirpath, fn)
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        for link in link_re.findall(text):
            if link.startswith(("http://", "https://", "mailto:")):
                continue
            if link.startswith("#"):
                continue
            link_path = link.split("#", 1)[0]
            if not link_path:
                continue
            target = os.path.normpath(os.path.join(dirpath, link_path))
            if not os.path.exists(target):
                missing.append((path, link, target))
if missing:
    print("Missing links:")
    for m in missing:
        print(m)
    raise SystemExit(1)
print("All internal links resolved.")
PY
```

6. Commit the documentation changes separately (after the feature commit). Use a clear message like `docs: update for <feature>`.

## Scope reminders

- Focus on user-facing behavior, APIs, data model changes, and onboarding/admin flows.
- If a change does not affect any documented behavior or assumptions, no docs update is required.
