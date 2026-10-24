# Repository size

A clone is heavy because of history, not because of the files on `main`. Measured on 2026-10-24 on the last 50 commits:

| What | In history | On `main` today |
|---|---|---|
| `docs/media/video/*.mp4` (720p films, now release assets and ignored) | 46 blobs, 126 MB | none |
| `docs/media/*.gif` (README and page previews, every version kept) | 63 blobs, 116 MB | 13 files, 28 MB |
| `tests/goldens/**/*.deflate` (compact golden frames) | 38 MB | about 6 MB |
| everything else | under 15 MB | |

`.git` was 289 MB for those 50 commits. The sparse clone in the README avoids most of it for a skill install; a contributor's full clone does not.

## Keeping it from growing

- Films stay release assets (`gh release upload media ...`), never commits; `.gitignore` already enforces it.
- Each new GIF version adds its full size to every future clone. Optimise before committing (`gifsicle -O3 --lossy=40`, or fewer frames), and replace a GIF only when the change is worth its size.
- Golden frames: regenerate only when the picture really changed, in one commit, not in every iteration of a branch.

## Removing what is already there (rewrites history: a maintainer's decision)

This changes every commit hash. Every clone and fork has to be re-cloned, open pull requests have to be rebased, and GitHub keeps the old objects reachable through pull-request refs until its support runs a garbage collection on request.

```sh
pip install git-filter-repo
git clone --mirror https://github.com/DiegoLopez0208/mechanism mechanism.git && cd mechanism.git
git filter-repo --analyze                                  # .git/filter-repo/analysis: the biggest paths, to confirm the numbers above
git filter-repo --invert-paths --path docs/media/video/    # the films: already release assets
# optional: older GIF versions are not removable without losing the files on main; keep them, or move docs/media to Git LFS:
# git lfs migrate import --everything --include="docs/media/*.gif"
git push --force --mirror
```

Then ask GitHub Support to run garbage collection on the repository, so the removed blobs stop being served through old pull-request refs.
