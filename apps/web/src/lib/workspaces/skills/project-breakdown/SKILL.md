---
name: project-breakdown
description: Convert a learning goal, project idea, or vague request into concrete tasks, checkpoints, and review loops.
---

# Project breakdown

## When to use

Use this skill when the user asks to plan, organize, build, study over time, or turn an idea into steps.

Do not use it for quick conceptual explanations unless the user asks for a plan.

## Instructions

1. Restate the goal in one concrete sentence.
2. Break work into small tasks that can be completed and reviewed.
3. Include checkpoints where the learner receives feedback.
4. Prefer visible outcomes: note, quiz, diagram, app, explanation, or solved problem.
5. Identify dependencies and the next immediate action.
6. If task-creation tools are available, ask approval before writing shared tasks.

## Output

Return:

- goal
- 3-6 ordered tasks
- checkpoint or review method
- next action

If writing tasks to the workspace, use the approved `create_workspace_task` flow instead of only listing them in chat.
