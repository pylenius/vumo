# @vumo/skills

Agent skill files describing best practices for working in vumo projects. Designed for AI coding agents (Claude Code, Cursor, Codex, etc.) that load skills from a repository to obtain domain-specific knowledge before writing code.

## Layout

```
skills/
└── vumo/
    ├── SKILL.md          # Main entry — loaded when the skill is active
    └── rules/            # Topical deep-dives the agent can pull on demand
        ├── compositions.md
        ├── sequencing.md
        ├── audio.md
        ├── timing-and-animation.md
        ├── delay-render.md
        ├── determinism.md
        └── rendering.md
```

Each `SKILL.md` starts with YAML frontmatter (`name`, `description`, `metadata.tags`) followed by Markdown sections an agent reads top to bottom.

## Using these skills

### Claude Code (npm install)

```bash
mkdir -p .claude/skills
npm pack @vumo/skills | xargs -I{} tar -xzf {} -C .claude/skills --strip-components=2 package/skills/vumo
rm vumo-skills-*.tgz
```

That drops `.claude/skills/vumo/SKILL.md` + the `rules/` directory into your project. Claude Code picks it up automatically on next launch.

### Claude Code (from this repo, no npm)

```bash
mkdir -p .claude/skills
curl -L https://github.com/pylenius/vumo/archive/refs/heads/main.tar.gz \
  | tar -xz --strip-components=4 -C .claude/skills \
    vumo-main/packages/skills/skills/vumo
```

### Cursor / Codex / other agents

Copy `skills/vumo/SKILL.md` into your agent's instruction file (`AGENTS.md`, `.cursorrules`, etc.). Reference the `rules/` files when you need a specific topic.

### Manual reference

The Markdown is human-readable — feel free to read it yourself when stuck.

## Authoring conventions

- **One topic per rules file.** Keep them focused — an agent should be able to load just the one file relevant to its current task without dragging in unrelated context.
- **Use FORBIDDEN callouts** for things that look fine but break render-time determinism (CSS animations, real-clock APIs, etc.). Capital letters earn the agent's attention.
- **Show working code, not partial sketches.** Each example should be copy-paste runnable inside a fresh vumo project.
- **State the version that the example targets** at the top of any rule that depends on a specific API (this lets future skill maintenance pick up drift).
