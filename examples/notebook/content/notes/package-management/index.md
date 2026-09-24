---
title: Keeping Python projects reproducible
description: "A practical routine for dependencies: declare intent, lock a working environment, and make updates a deliberate step rather than a surprise."
date: 2026-05-18
lastmod: 2026-06-18
tags: [tools/python]
authors: [rowan]
params:
  pinned: false
---
## Declare intent

Start with the dependencies that the project actually imports. Keep direct requirements separate from the complete environment: the first describes what you need; the second records what worked together.

A lockfile is a useful handoff to your future self. It is not a substitute for knowing which packages belong to the application and which are only development tools. Keep that distinction visible in the project configuration.

### Keep the environment local

Create the environment beside the project rather than sharing one installation across unrelated work. This makes experiments cheap and recovery straightforward. If an upgrade fails, recreate the environment from the last working lockfile.

Write down the interpreter version as well. A dependency list alone does not capture the runtime, the operating system, or the native libraries that a package may use.

## Make updates deliberate

Update one small group of related packages at a time. Read the release notes, run the project's checks, and inspect the resulting lockfile before committing it. A small change is easier to understand and easier to reverse.

For a personal tool, a quick end-to-end run may be enough. For a shared application, test the paths that people actually rely on. The useful question is not whether installation succeeded, but whether the project still does its job.

### Leave a recovery path

Keep the previous working state in version control. Avoid editing generated dependency records by hand unless the tool explicitly supports that workflow. When a problem appears, record the command and the smallest example that reproduces it.

## Revisit the setup

The final step is to try a clean environment. This catches dependencies that were present on your machine but never declared by the project. It also tests whether the written setup instructions are sufficient for someone starting from nothing.

A reproducible setup should be boring: a short sequence, explicit inputs, and no hidden state. Revisit the instructions when the process changes, not only when somebody gets stuck.

## Related notes

Continue with [Python environments](../python-environments/) or return to [all notes](../). Both records are living notes, revised as the workflow changes.
