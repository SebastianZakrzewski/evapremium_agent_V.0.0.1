---
name: capture-architecture
description: Captures accepted architectural, product, reliability, security, and implementation-planning decisions in the project's durable documentation. Use automatically after the user explicitly approves a decision, asks to preserve architectural context, or approves implementation of an architecture-changing design. Do not use for tentative discussion, brainstorming, or rejected alternatives.
---

# Capture Architecture

Persist accepted decisions from the conversation in the smallest appropriate set
of project documents.

## Trigger conditions

Apply this skill when at least one condition is true:

- The user explicitly accepts an architectural decision.
- The user asks to save, capture, document, or preserve project context.
- The user approves implementation of a design that changes system boundaries,
  contracts, data flow, infrastructure, security, or reliability.

Do not modify documentation when:

- options are still being compared,
- the user is brainstorming or asking a hypothetical question,
- an apparent decision is ambiguous,
- the user rejects or postpones the proposal.

If acceptance is unclear, ask one focused question before writing.

## Workflow

1. Read `AGENTS.md`, `ARCHITECTURE.md`, and
   `DOCUMENTATION_STRUCTURE.md`.
2. Inspect existing documentation relevant to the accepted decision.
3. Extract only durable information:
   - the accepted decision,
   - its current rationale,
   - affected boundaries or contracts,
   - important constraints and consequences,
   - unresolved questions explicitly retained by the user.
4. Separate accepted facts from proposals and rejected alternatives.
5. Select the smallest appropriate documentation target.
6. Update existing documents before creating new ones.
7. Create an optional document or directory only when the criteria in
   `DOCUMENTATION_STRUCTURE.md` are met.
8. Re-read changed files and verify that they agree with each other and with the
   accepted decision.
9. Report which durable facts were captured and which files changed.

## Document selection

- Update `ARCHITECTURE.md` for current high-level components, boundaries,
  dependencies, contracts, integrations, and data flows.
- Use `docs/design-docs/<topic>.md` for detailed technical design, rationale,
  trade-offs, constraints, and consequences.
- Use `docs/product-specs/<feature>.md` for user behavior, business rules,
  requirements, edge cases, and acceptance criteria.
- Use `docs/exec-plans/active/<topic>.md` when an accepted design requires
  substantial multi-step implementation.
- Update `docs/SECURITY.md` for cross-cutting security requirements and threat
  decisions.
- Update `docs/RELIABILITY.md` for availability, recovery, observability, SLO,
  and failure-handling decisions.
- Update `docs/FRONTEND.md` or `docs/DESIGN.md` only for cross-cutting frontend or
  design-system rules.
- Add reference material under `docs/references/` only for a technology actually
  used by the project, including its source and version.
- Never manually edit files under `docs/generated/`.

Create or update an index only when it improves navigation across multiple real
documents. Do not create empty directories or placeholder files.

## Writing rules

- Preserve the existing language of each document.
- Describe the current accepted state, not the chronology of the conversation.
- Keep rationale that prevents the same decision from being reopened without new
  evidence.
- Do not copy the transcript or expose hidden reasoning.
- Do not invent implementation details, requirements, owners, dates, metrics, or
  decisions.
- Mark genuinely unresolved items as open questions rather than facts.
- Remove or revise statements made obsolete by the accepted decision.
- Prefer links to one source of truth over duplicated explanations.
- Keep unrelated content unchanged.

## Permission and mode handling

This skill does not bypass workspace permissions.

- In an editing-capable mode, update the files after the trigger condition is
  satisfied.
- In a read-only mode, identify the intended updates and ask the user to switch
  to an editing-capable mode. Do not claim that the context was persisted.

## Completion checklist

- [ ] The decision was explicitly accepted.
- [ ] Tentative and rejected ideas were excluded.
- [ ] Existing documentation was inspected first.
- [ ] The smallest suitable set of files was changed.
- [ ] No empty or speculative documentation was created.
- [ ] Cross-document contradictions were resolved or reported.
- [ ] Changed files were re-read and the captured context was summarized.
