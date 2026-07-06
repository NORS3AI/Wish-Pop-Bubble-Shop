# CLAUDE.md: Project Operating Rules

This repo is maintained by someone who does not write code. You (Claude Code) own the
technical work end to end. Keep everything working, keep it simple, and keep her out of
the weeds.

## Who you're working with
- The owner is not a developer. Do not ask her to run git commands, edit files, resolve
  merge conflicts, or make technical decisions.
- Never hand her a task that needs coding knowledge. If something needs doing, you do it.
- After you finish, explain what you did in plain language, in one or two sentences. No jargon.

## The Three Rules (non-negotiable)

### Rule 1: Always commit, push, and merge.
After any change, no matter how small, you commit it, push it to GitHub, and merge into
`main`. Never leave work uncommitted or sitting on a side branch. The public repo and the
live site should always reflect the latest working version. Write a short, clear commit
message describing what changed.

### Rule 2: Never ask for permission on routine work.
Assume you already have approval to read, write, edit, run commands, commit, push, and
merge. Do not stop to ask "can I do this?" for normal development, file edits, or git
operations. Just do the work. (This is also enforced in `.claude/settings.json` so the
prompts don't appear.) The only time you pause is if an action would delete large amounts
of work, expose a secret or API key, or change billing/account settings.

### Rule 3: Assume your first draft has bugs. Audit, then fix.
You are a capable coder who still makes mistakes. Treat every piece of code you write as
unverified until you have checked it.
1. After writing code, re-read it and look for errors, typos, broken paths, and logic mistakes.
2. Where possible, actually run or test it (open the page, run the build, check the console).
3. Fix what you find, then verify the fix.
4. Only then commit. Never commit code you have not audited.

## The branch: `main`
The `main` branch is the main branch. It is already set up and is the default branch for
this repo. All work targets `main`: every commit, push, and merge goes to `main`. Do not
create long-lived side branches or leave work on any other branch. When you finish a change,
`main` is where it lands.

## GitHub Pages: hosting the game

The game is served through GitHub Pages from the `/docs` folder on the `main` branch.

- All playable game files live in `/docs`. The entry point must be `/docs/index.html`.
- When the game is ready, make sure `/docs/index.html` loads and works on its own.
- Pages setting (owner does this once in the browser): Settings > Pages > Source:
  "Deploy from a branch" > Branch: `main` > Folder: `/docs` > Save.
- After that, every push to `main` updates the live game automatically.

### The play URL (case sensitive: this matters)
The live game URL is:

`https://<USERNAME>.github.io/<REPO>/`

- Replace `<USERNAME>` and `<REPO>` with the real GitHub username and the exact repository name.
- **The repository name in the URL is case sensitive.** If the repo is named `NekrosGrimoire`,
  the URL must be `https://<username>.github.io/NekrosGrimoire/`. A lowercase
  `.../nekrosgrimoire/` will 404.
- Always write the URL in the README using the exact same capitalization as the repo name.
- On your first run in this repo, detect the real username and repo name and replace the
  placeholders everywhere they appear (README and this file).
- Whenever the game becomes playable, make sure this exact URL sits at the top of the README
  as a clear "Play the game" link.

## Mobile and vertical (portrait) gameplay
This game is played vertically (portrait) on phones. Whenever game files are added or updated
in `/docs`, check the mobile experience before you commit:
- `/docs/index.html` must have a mobile viewport tag in `<head>`:
  `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">`
- The game should fill the screen in portrait with no page scrolling or pinch-zoom. Lock the
  page (for example `html, body { margin: 0; overflow: hidden; overscroll-behavior: none; }`
  and appropriate `touch-action`) so it does not bounce or scroll behind the game.
- Respect notches and home bars using safe-area insets (`env(safe-area-inset-*)`) so nothing
  is cut off or hidden.
- Scale to different phone sizes. The play area should fit portrait screens from small to
  large without overflowing or leaving big empty gaps.
- A normal web page cannot force a phone to rotate, and iOS Safari will not lock orientation.
  If the game only works in portrait, add a simple "Please rotate to portrait" overlay that
  shows when the phone is in landscape.
- Test at a phone-shaped portrait size, not just desktop. Confirm taps/touch controls work,
  buttons sit within thumb reach, and nothing overflows the screen.
- Only commit once it looks and plays right in portrait on a phone.

## README.md: keep it current
You own the README. After meaningful changes, update it so it always reflects reality:
- A one-line description of the game at the top.
- The **Play the game** link (the case-correct Pages URL above), shown prominently once the
  game is live.
- A short "What's new" note when you ship something.
- Keep it readable for a non-technical person. No setup instructions she does not need.

## CLAUDE.md: keep it current
If the project structure, the play URL, or the workflow changes, update this file so it
stays accurate. This file is the source of truth for how you operate here.

## Default workflow for every request
1. Do the work she asked for.
2. Audit and test it (Rule 3).
3. Fix any bugs, re-test.
4. Commit, push, merge into `main` (Rule 1).
5. Update the README (and this file if needed).
6. Tell her in one or two plain sentences what you did, and if the game is live, remind her
   of the play link.
