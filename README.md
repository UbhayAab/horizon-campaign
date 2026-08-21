# Horizon Campaign Playbook

An eight-stage, twenty-cohort email campaign for **Horizon**, the Jarurat Care Foundation
global cancer-care forum, designed against what **JCF-Mailer** can actually do rather than
against what a marketing-automation brochure says it should.

It is two documents in one: a teaching playbook for the marketing team, and an execution
spec for whoever runs the sends.

- **Read it:** `site/index.html`, or the published artifact
  <https://claude.ai/code/artifact/507cd015-3b05-4f7b-ba28-660c08a100e9>
- **Source of truth:** `PLAYBOOK.md`

## What is in it

| | |
|---|---|
| Stages | 8, over 43 days |
| Cohorts | 5 pre-send, 15 behavioural |
| Campaign rows to run | 45, none larger than 600 recipients |
| Emails written in full | ~40 bodies, including every cohort branch and both A/B arms |
| A/B tests | 8, of which exactly 1 is genuinely powered at this list size |
| Roster | 3,363 doctors, about 92 percent free-mail |

Section 5 is a mermaid branch map of the whole flow. Section 9 is the Monday-morning
runbook: the ordered checklist an operator executes, with the real endpoints and the manual
workarounds where the platform has no automation.

## The findings that outrank the flow

1. **Email is not the growth channel yet.** On 27 June 2026, 209 people attended. 18 were on
   the emailed list. 191 came through WhatsApp forwards, social and word of mouth. Until that
   ratio moves, subject-line optimisation is optimising the wrong variable.
2. **The list is too small for most of the tests anyone wants to run.** At ~1,680 per arm, a
   click-rate test on a 3 percent base cannot resolve any difference real copy produces. Only
   the sender-identity test clears the bar. The rest are labelled exploratory with
   pre-registered decision rules, not "winners".
3. **A no-mail holdout of 335 people runs for the whole edition.** It is the first honest
   measurement of what email actually causes, and it resolves a lift of 4 points or better.
4. **SES declaration risk.** The production-access letter declared strictly transactional mail
   to people who opted in at `jarurat.care/doctor-form`. The cold cohort's provenance is a
   scraped professional listing. That has an owner and a deadline in Section 2.3, and it is
   the single most likely cause of a production-access revocation.

## Platform blockers found in the JCF-Mailer source

Every capability claim in the playbook was checked against
`Carcinome Brochure/mailer/JCF-Mailer`. Five things need a person or a patch before Day 1:

| | Blocker | Fix size |
|---|---|---|
| P0-1 | No per-campaign sending domain; `SesSender` always uses one global `from` | decision |
| P0-2 | `SmtpProbe` is off and port 25 is blocked, so verification is not a bounce gate | decision |
| P0-3 | The scheduler parses times with no timezone; a UTC box fires 07:10 IST at 12:40 IST | config |
| P0-4 | No SNS topic, so no per-message delivery or soft-bounce truth | AWS IAM |
| P0-5 | No abort endpoint; the only emergency stop is `systemctl restart` | small patch |

Two more worth knowing: `{{FIRST_NAME}}` in a **subject line** ships literally and
`validate()` will not warn you, and reply detection is days of work rather than weeks because
JMAP already fetches `inReplyTo` and the API simply forgets to return it.

## Build

`site/index.html` is generated, not hand-written. Edit `PLAYBOOK.md`, then:

```
python build/build.py
```

`build/build.py` is a small purpose-built Markdown converter; `build/shell.html` is the page
shell and design system. The design is **WARD PAPER**, lifted from the project's own tokens at
`Carcinome Brochure/Patient Navigator/css/variables.css`: petrol-teal `#006469` on sand
`#F6F2EA`, Archivo and Spline Sans Mono, light and dark both solved for contrast.

The published page has no doctype of its own, because the Artifact host supplies one. Opening
`site/index.html` straight from disk therefore lands in quirks mode and the scroll-spy rail
misbehaves; that is a local-preview artifact, not a bug in the page.

## Research

`research/workflow.js` is the multi-agent workflow that produced this: 13 agents in four
phases, three grounding the work in the source tree and the June campaign, six designing
cohorts, stages, tests, copy and measurement, three attacking the result adversarially, one
synthesising. `research/workflow-agent-output.json` is their structured output, kept so any
number in the playbook can be traced back to the agent that produced it.

## Related

The mailer itself lives in its own repo: `UbhayAab/JCF-Mailer`.
