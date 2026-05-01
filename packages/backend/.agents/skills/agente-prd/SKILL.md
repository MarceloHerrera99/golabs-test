---
name: agente-prd
description: Create, refine, question, or review Product Requirements Documents
  (PRDs) in Spanish or English. Use when the user wants to turn a product idea,
  feature request, business need, user problem, backlog item, or rough notes
  into a structured PRD; when they want clarifying questions before drafting; or
  when they want an existing PRD evaluated for missing requirements, unclear
  scope, risks, metrics, dependencies, or engineering readiness.
---

# Agente PRD

Turn product ideas, feature requests, and rough notes into clear PRDs that are
ready for discussion with product, design, engineering, data, operations, or
business stakeholders.

## Follow This Workflow

1. Identify whether the task is to create, refine, review, or prepare questions
   for a PRD.
2. Inspect the request for missing context that would change scope,
   requirements, priority, or solution.
3. Ask up to 5 concise questions only when the missing answer materially changes
   the output.
4. Draft immediately when the user asks for speed or when a reasonable first
   version can be produced with explicit assumptions.
5. Include an open questions section whenever uncertainty remains.

## Match the User's Language

- Respond in the user's language unless the user explicitly asks for another
  language.
- If the user writes in Spanish, write the PRD in Spanish and use Spanish
  headings such as `Titulo`, `Resumen`, and `Preguntas abiertas`.
- If the user writes in English, write the PRD in English and use English
  headings.
- If the user mixes languages, follow the latest explicit language preference.

## Ask Questions Only When Needed

Do not ask questions by default. Ask only when the answer changes scope,
requirements, priority, or the recommended solution.

Prioritize up to 5 questions in this order:

1. Who is the target user?
2. What problem or need does this solve?
3. What outcome or metric defines success?
4. What must the first version include?
5. What must stay explicitly out of scope?
6. Are there technical, business, legal, regulatory, or time constraints?
7. Are there existing flows, designs, APIs, data models, documents, or systems
   that must be respected?

If the user provides little context or asks for a fast first draft, continue
with clearly marked assumptions instead of blocking.

## Scale the Output

- For small features, produce a short PRD with problem, scope, requirements,
  acceptance criteria, and open questions.
- For medium features, include goals, non-goals, users, user stories,
  functional requirements, dependencies, data, risks, rollout, and metrics.
- For larger initiatives, add phases, permissions, migrations, analytics,
  operational impact, rollout decisions, edge cases, and outstanding decisions.

## Use This PRD Structure

Use the sections that add value and omit the rest.

### Title

Use a clear feature or initiative name.

### Summary

Explain in 2-4 sentences what will be built, for whom, why it matters, and what
outcome is expected.

### Problem

Describe the current user or business problem. Include current state, friction,
impact, and evidence when available.

### Users

Identify relevant users, roles, or segments. For each one, cover main need,
usage context, expected frequency, and permissions or constraints when those
details matter.

### Goals

List outcomes the feature must achieve. Make them measurable or at least
verifiable. Tie them to the problem instead of restating the implementation.

### Non-Goals

List what this version will not solve so scope stays protected.

### Scope

Separate what is in the first version from what is later or out of scope. Use
`MVP`, `Later`, and `Out of Scope` when helpful.

### Functional Requirements

Write requirements as observable behavior. Prefer this format:

```text
RF-1: [Actor] can [action] to [result].

Acceptance criteria:
- Given [context], when [action], then [result].
- The system must [verifiable behavior].
```

### Non-Functional Requirements

Include only what applies, such as performance, availability, security,
privacy, auditability, accessibility, compatibility, localization, or
scalability.

### User Experience

Describe the intended flow without over-designing the interface. Cover entry
point, main steps, empty states, errors, confirmations, permissions,
notifications, and sensitive copy when relevant.

### Data and Analytics

Define the events, metrics, and data needed to measure success or monitor the
feature. Common examples include start events, completion events, errors,
conversion, retention, time to complete, volume, or adoption rate.

### Edge Cases

List the situations most likely to break the experience, such as incomplete
data, insufficient permissions, duplicates, concurrency, network failures,
legacy states, ineligible users, or plan limits.

### Dependencies

List systems, teams, decisions, data, APIs, designs, approvals, or migrations
that are required.

### Risks

For each meaningful risk, state impact and mitigation:

```text
Risk: ...
Impact: ...
Mitigation: ...
```

### Rollout

Describe the launch approach, such as feature flags, beta, pilots, migration,
communication, support, monitoring, and rollback plan.

### Acceptance Criteria

List the conditions that must be true for the feature to be considered ready.

### Open Questions

List pending decisions in an actionable way. If they block execution, say so
clearly.

## Apply These Writing Rules

- Write verifiable requirements, not aspirational statements.
- Separate goals from solutions when the solution is not yet validated.
- Distinguish scope from out-of-scope items.
- Convert vague phrases into observable conditions.
- Include acceptance criteria for the main requirements.
- Mark assumptions explicitly with `Assumption:` or `Supuesto:`.
- Mark unresolved uncertainty with `Open question:` or `Pregunta abierta:`.
- Do not invent legal, technical, or business constraints. State them as
  assumptions or open questions when they are unknown.
- Avoid excessive documentation when the user only needs a first version.

## Review Existing PRDs

When the user provides a PRD for review:

1. List blockers and implementation risks first.
2. Flag ambiguous requirements, undefined scope, missing metrics, hidden
   dependencies, unclear ownership, missing edge cases, and engineering
   readiness gaps.
3. Suggest concrete replacement text when that will help the user fix the
   document faster.
4. Keep the summary brief and action-oriented.

## Hold This Quality Bar

A PRD is ready for engineering when:

- The problem is clear.
- The target user is defined.
- The first-version scope is closed.
- Non-goals prevent scope creep.
- Requirements are testable.
- Acceptance criteria cover the main flow.
- Major edge cases are visible.
- Dependencies are explicit.
- Risks have mitigations or pending decisions.
- Success metrics are measurable.
- Open questions do not hide blockers.

## Flag These Quality Problems

Call out and correct:

- Words like `easy`, `intuitive`, or `fast` without a verifiable definition.
- Requirements mixed with premature UI decisions.
- Open-ended scope.
- Missing non-goals.
- Missing user roles or segments.
- Vanity metrics with no decision value.
- Vague acceptance criteria.
- Missing errors, permissions, or edge cases.
- Hidden dependencies.
- Assumptions presented as facts.
