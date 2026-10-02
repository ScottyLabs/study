# General Feature-Development Workflow

This guide describes the usual path from being assigned an issue to merging a finished feature into its base branch. It is aimed especially at teammates who are new to software engineering or to working on a larger team.

You do not need to follow every step exactly. As you gain experience, you will develop a workflow that suits you, but this is a solid starting point.

## At a glance

1. Understand the issue.
2. Plan the feature.
3. Implement and verify small, reviewable changes.
4. Test the complete feature locally and on the development app.
5. Open, address feedback on, and merge a pull request.

---

## 1. Start with the issue

### 1. Be assigned an issue

Your Tech Lead will assign you an item from the backlog on the [CMU Study Project Board](https://git.cmu.dev/ScottyLabs/study/projects/5). Once it is assigned, move it to the **To Do** column, even if you are not starting on it immediately.

If you have no active assigned issues, ask a lead.

### 2. Read it thoroughly and ask questions

Most issues include a problem or feature description followed by **acceptance criteria**, the conditions that must be true for the work to be considered done.

- If either is missing, add it to the issue first. Ask the issue’s author what they intended if anything is unclear.
- Read the description and acceptance criteria carefully. Ask questions now, before implementation starts.
- If the issue requires product or technical decisions, discuss and record them now.
- Update the issue with any useful discoveries or decisions.

---

## 2. Prepare and plan

### 3. Create a branch

First, bring your local base branch up to date:

```bash
git fetch  # retrieves changes from the remote repo without updating your local branch
git checkout <base-branch-name>  # switches your local repo to the base branch
git pull  # updates your local base branch to the remote base branch
```

Then create your feature branch:

```bash
git checkout -b <your-branch-name>  # creates a new branch off of the current branch
```

Use a short, feature-focused branch name of one to three words separated by dashes, such as `calendar-export`. Do not include your name or Andrew ID; the repository already records ownership.

Move the issue to "In Progress" so we know you are starting on it and don't reassign it.

### 4. Write a high-level plan

After confirming the intended result, write a high-level plan. It should stand on its own and be more detailed than the issue. Someone should be able to understand the feature without first reading the issue, and if multiple people (or agents) implemented the feature based on that plan, the result should be the same (even if individual lines of code differ).

Describe:

- What you are implementing.
- How the feature should look and behave.
- The resulting user experience.
- The relevant code-design decisions, without low-level implementation detail.

This does not need to be formal prose. It may be a Markdown or text file, or a detailed prompt for an AI agent. The important part is that **you** make the product and design decisions; an agent can then help implement your vision.

### 5. Create a detailed implementation plan

Create a low-level implementation plan from the high-level plan. You may write it yourself or ask an agent to draft it; either way, make sure it includes verification steps.

Plan mode (often `/plan`) is useful for this. It can be helpful to save the plan in a file so you can edit it, revisit it when bugs or requirements change, and share it across agent sessions or tools. Planning should take multiple iterations and you should be able to explain trade-offs for your design decisions. Since AI can implement your plan quickly, it's expected that most of your time is spent creating a high-quality plan that you can explain and defend.

Read and understand every planned step. AI-generated plans can suggest work that does not make sense in your project or make assumptions you did not intend. It is much faster to correct those gaps now than after implementation begins.

### 6. Break the plan into concrete commits

Split the implementation into small, clear steps. Each step should be independently verifiable and ready to commit before you move to the next one.

You can define these steps yourself or ask an agent to suggest them from your implementation plan.

---

## 3. Implement and verify

### 7. Execute the plan

Implement each step, with or without AI assistance. If you use an agent, ask it to verify its work as well by writing tests. "Test-driven development" is often helpful, which means writing the tests for the step first (based on the plan), which should fail with the current code, then implementing the code for that step until it passes the tests. This often results in better code that more closely matches the plan, since the tests aren't just written to match an existing (possibly buggy) implementation, as well as a better test suite.

Run the application (see [`README.md`](README.md) for instructions) and fully test each step before committing it. Then repeat for the next step.

```bash
git add <files>
git commit -m "A concise, one-sentence description of this commit"
```

Use the project’s conventional-commit conventions where applicable.

### 8. Verify the complete feature

When all implementation steps are done, test the feature thoroughly yourself.

You should already have a lot of tests from the last step, but they are likely not exhaustive yet. Write additional unit tests based on the **high-level plan**, not on the implementation. One useful approach is to start a separate agent session and ask it to reference only the plan. This helps expose cases where the implementation differs from the intended behavior.

Fix the code (or, occasionally, the test when the test is genuinely incorrect) until the feature’s unit tests pass. Also verify that all existing tests still pass. Repeat this process for integration tests.

### 9. Test different screen sizes

Any UI change must work on laptop, mobile, and tablet screen sizes.

In browser developer tools:

1. Press <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> on macOS, or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> on Windows.
2. Select the device-emulation button in the top toolbar (it looks like a laptop and phone).
3. Use the first dropdown ("Dimensions") to select device sizes and shapes.

Try at least one laptop, phone, and tablet size. Make sure the UI remains usable and looks intentional in each.

---

## 4. Sync, deploy, and test the development app

### 10. Update from the base branch

If the base branch has changed since you began, update your branch before pushing:

```bash
git checkout <base-branch-name>
git fetch
git pull
git checkout <your-branch-name>
```

Choose whether to rebase or merge before updating your branch:

- **Rebase** when you are the only person working on the feature branch and want a clean, linear commit history. This is usually best before opening a pull request, or when you have not shared the branch with others.
- **Merge** when the branch is shared, someone else may have based work on it, or you do not want to rewrite published history. Merging adds a merge commit but is the safer choice for collaborative branches.

Follow any repository- or lead-specific preference if one exists.

To rebase, run:

```bash
git rebase <base-branch-name>
```

If you have already pushed a branch that only you use, rebasing changes its commit history. Push the rewritten history with:

```bash
git push --force-with-lease
```

Use `--force-with-lease`, not `--force`: it refuses to overwrite remote commits you do not have locally.

To merge, run:

```bash
git merge <base-branch-name>
```

You may need to resolve merge conflicts. In VS Code, open the Source Control panel, select a conflicted file, and choose **Open in Merge Editor**. Once you resolve the conflicts, continue with `git rebase --continue` or complete and commit the merge.

Repeat [full-feature testing](#8-verify-the-complete-feature) and [responsive testing](#9-test-different-screen-sizes) afterwards. This matters: base-branch changes can break work that previously passed.

### 11. Push your branch

```bash
git push -u origin <your-branch-name>
```

CI will run on [git.cmu.dev/Scottylabs/study](https://git.cmu.dev/ScottyLabs/study): unit tests run first, followed by integration tests if they pass. If all tests pass, it deploys your branch to `dev.cmustudy.com`.

Monitor progress from the repository’s **Actions** tab by finding your latest commit. A run usually takes about five minutes when no other jobs are queued, but may take longer during busy periods.

### 12. Test on the development app

After your branch deploys to `dev.cmustudy.com`, test the feature there thoroughly, including on multiple screen sizes.

The development app runs on Railway with a development PostgreSQL database, making it closer to production than your local environment. It can reveal issues that local testing misses, such as changed environment variables or authentication configuration.

---

## 5. Open, review, and merge the pull request

### 13. Create a pull request

Once the feature works on the development app:

1. Open the repository at [git.cmu.dev/Scottylabs/study](https://git.cmu.dev/ScottyLabs/study) and select **Pull Requests**.
2. Select **New pull request**.
3. Choose `ScottyLabs:<base-branch-name>` as the base and `ScottyLabs:<your-branch-name>` as the compare branch.
4. Fill out the generated PR template.
5. Add the issue number after `Closes #` so the issue is linked and automatically closed when the PR merges.
6. Request review from the leads: `annadavi`, `cseluzhy`, and `mishag`.
7. Move the issue to "In Review"

### 14. Respond to review comments

Leads may ask questions, request code changes, or request additional tests. Reply to questions directly in the PR. You should not close and reopen the PR.

For code changes, update your branch, test the changes thoroughly, and push again. This automatically updates the PR, reruns tests, and redeploys the branch to development. If the base branch changed, update your branch first; see [step 10](#10-update-from-the-base-branch). Your new code will show in the PR. Re-request review from each lead so we know you have updates ready.

### 15. Merge the pull request

After a lead approves the PR, you may merge it into the base branch yourself. One approval is sufficient, but it must come from a lead.

If the PR is out of date, update it from the base branch, test again, and push before merging.

- A merge into `main` runs tests again and then deploys to production (usually about five minutes when no jobs are queued).
- A merge into another branch deploys to development.

Monitor the deployment in the **Actions** tab. Once it completes, verify the feature one final time. If anything breaks, revert the PR and contact the leads so the team can investigate; the problem may not be in your change.

---

## 6. Done!

Congratulations! You have implemented a feature and closed an issue for CMU Study. Move the issue to "Done". Let a lead know so they can assign your next task.
