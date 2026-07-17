# AI-test

Instructions for candidates completing this exercise.

## Setup

### 1. Make sure Git is initialized

Confirm that this directory is a Git repository and that you can commit and push changes:

```bash
git status
git remote -v
```

If Git has not been initialized yet, run:

```bash
git init
```

Do not push anything until you are fully complete with the instructions.

### 2. Create a feature branch

Create a new branch named after yourself:

```bash
git checkout -b feature/your-name
```

Replace `your-name` with your actual name (e.g. `feature/jane-doe`).

### 3. Follow the instructions you receive

Listen to and follow the instructions provided to you during the exercise.

### 4. Install the test rule in your LLM or IDE

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

### 5. Test that the rule is working

After the rule is in place, send any prompt to your LLM or instruction AI (for example: “Say hello”).

**Expected result:** the AI creates a `prompts/` folder containing a `prompts.md` file with your prompt logged inside, and commits the change to git.

If that folder and file appear after your test prompt, the rule is installed correctly.

### 6. Create a pull request into `master`

After you have completed all instructions, open a pull request from your feature branch into `master`:

```bash
git push -u origin feature/your-name
gh pr create --base master --title "Complete candidate exercise" --body "Completed all setup and exercise instructions."
```

