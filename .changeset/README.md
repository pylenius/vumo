# Changesets

This directory holds [Changesets](https://github.com/changesets/changesets) for the vumo monorepo.

## Adding a changeset

```bash
pnpm changeset
```

Pick the affected packages, the bump level (patch/minor/major), and write a short summary. Commit the generated `.changeset/<name>.md` file alongside your code change.

The four publishable packages (`@vumo/core`, `@vumo/preview`, `@vumo/renderer`, `@vumo/cli`) are **linked** — they always bump to the same version on release.

The release workflow in `.github/workflows/release.yml` either opens a "Release vumo" PR with the consolidated changelog, or publishes to npm once that PR is merged.
