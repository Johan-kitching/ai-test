# AI-test

Instructions for candidates completing this exercise.

## Setup

### 1. Create a feature branch

Create a new branch named after yourself:

```bash
git checkout -b feature/your-name
```

Replace `your-name` with your actual name (e.g. `feature/jane-doe`).

### 2. Follow the instructions you receive

Listen to and follow the instructions provided to you during the exercise.

### 3. Install the test rule in your LLM or IDE

Copy the rule file from the **test rules** section of this repo:

```
test-rules/commit-user-prompts.mdc
```

Move a copy into whatever LLM or IDE you use, so it is **always applied** on every interaction. Where you put it depends on your tool:

| Tool | Typical location |
|------|------------------|
| **Cursor** | `.cursor/rules/commit-user-prompts.mdc` |
| **Other IDEs / agents** | Use that tool’s equivalent “always-on” rules or instructions folder |

The rule tells the AI to log every user prompt to `prompts/prompts.md` and commit the log automatically.

### 4. Test that the rule is working

After the rule is in place, send any prompt to your LLM or instruction AI (for example: “Say hello”).

**Expected result:** the AI creates a `prompts/` folder containing a `prompts.md` file with your prompt logged inside, and commits the change to git.

If that folder and file appear after your test prompt, the rule is installed correctly.

### 5. Create a pull request into `master`

After you have completed all instructions, open a pull request from your feature branch into `master`:

```bash
git push -u origin feature/your-name
gh pr create --base master --title "Complete candidate exercise" --body "Completed all setup and exercise instructions."
```

Replace `feature/your-name` with your branch name. If you do not use the GitHub CLI, create the PR through the GitHub web UI instead, targeting `master` as the base branch.
