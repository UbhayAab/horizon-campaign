export const meta = {
  name: 'jarurat-campaign-playbook',
  description: 'Design a 7+ stage, multi-cohort, A/B-tested email campaign flow for Jarurat Care on the JCF-Mailer platform, as a teaching playbook for the marketing team',
  phases: [
    { title: 'Ground', detail: 'audit the mailer, the campaign already sent, and the audience/compliance context' },
    { title: 'Design', detail: 'cohort taxonomy, stage architecture, A/B matrix, copy, measurement' },
    { title: 'Verify', detail: 'feasibility against the real API + completeness critique' },
    { title: 'Synthesize', detail: 'assemble the playbook' },
  ],
}

const MAILER = 'C:\\Users\\abhay\\Desktop\\Carcinome Brochure\\mailer\\JCF-Mailer'
const BROCHURE = 'C:\\Users\\abhay\\Desktop\\Carcinome Brochure'
const DESKTOP = 'C:\\Users\\abhay\\Desktop'

const CAP_SCHEMA = {
  type: 'object',
  properties: {
    capabilities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          status: { type: 'string', enum: ['exists', 'partial', 'missing'] },
          evidence: { type: 'string', description: 'file:line or endpoint proving it' },
          notes: { type: 'string' },
        },
        required: ['name', 'status', 'evidence', 'notes'],
      },
    },
    dataModel: { type: 'array', items: { type: 'string' }, description: 'entity: key fields, one line each' },
    endpoints: { type: 'array', items: { type: 'string' }, description: 'METHOD /path - what it does' },
    buildGaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          gap: { type: 'string' },
          whyNeeded: { type: 'string' },
          effort: { type: 'string', enum: ['small', 'medium', 'large'] },
          sketch: { type: 'string', description: 'concrete implementation sketch: classes/tables/endpoints to add' },
        },
        required: ['gap', 'whyNeeded', 'effort', 'sketch'],
      },
    },
  },
  required: ['capabilities', 'dataModel', 'endpoints', 'buildGaps'],
}

const CONTEXT_SCHEMA = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'string' } },
    sources: { type: 'array', items: { type: 'string' }, description: 'absolute file paths actually read' },
    uncertain: { type: 'array', items: { type: 'string' }, description: 'things you could NOT establish from files' },
  },
  required: ['findings', 'sources', 'uncertain'],
}

phase('Ground')

const [caps, history, audience] = await parallel([
  () => agent(
    `You are auditing an email-sending platform to find out exactly what campaign automation it can and cannot do today.

Read the Java source at: ${MAILER}\\src\\main\\java\\com\\jarurat\\mailer
Focus on: services/CampaignService.java, services/SesSender.java, controllers/CampaignApi.java, controllers/AudienceApi.java, controllers/TrackingController.java, analytics/* (OpenClassifier, OpenTrackingService, AnalyticsService), campaignsplus/* (SafetyCheckService, CsvImportService, TemplateLibraryService, AudienceRiskSource), models/*, sns/SnsWebhookController.java, mail/JmapClient.java + mail/MailService.java, verification/*.
Also read ${MAILER}\\src\\main\\resources\\application.properties (redact any secret values, never echo a key) and migrate-v2.sql.

Answer with evidence for EACH of these capabilities, marking exists / partial / missing:
1. audience segmentation by behaviour (opened / not-opened / clicked / bounced / replied / converted)
2. saved segments or dynamic lists vs static lists
3. campaign scheduling and send-window / throttle control
4. A/B split assignment (deterministic bucketing, variant tracking, winner selection)
5. open tracking + how it handles Apple MPP / bot opens (OpenClassifier)
6. click tracking + per-link attribution
7. reply detection (does JmapClient/MailService let you read the inbox and match replies to a campaign?)
8. conversion / registration tracking (can it know someone registered?)
9. bounce + complaint handling and automatic suppression
10. unsubscribe + global suppression
11. multi-step automation / journeys / triggered sends (does anything sequence sends over time?)
12. templates + merge/personalisation tokens (which token syntax?)
13. per-recipient state machine (what statuses does CampaignRecipient hold?)
14. sending identity, domain, SES config, warm-up or rate limiting
15. reporting: what metrics does AnalyticsService actually compute?

Then list the data model (entity: key fields) and the campaign-relevant HTTP endpoints with their controller base paths (join @RequestMapping base + @GetMapping/@PostMapping).

Finally, buildGaps: what must be BUILT to run a 7-stage multi-cohort A/B campaign on this platform. Be concrete and small-scoped: name the tables, classes and endpoints to add. Do not propose replacing the platform.

Be precise and evidence-based. Never guess a capability exists without a file reference.`,
    { label: 'audit:mailer-capabilities', phase: 'Ground', schema: CAP_SCHEMA }
  ),

  () => agent(
    `Find out what email campaign Jarurat Care / Carcinome actually sent recently, so a follow-up campaign can be designed on top of it.

Search these locations (Windows paths, use bash tools):
- ${BROCHURE}\\Emails
- ${BROCHURE}\\Bot_Email  (esp. bulk_sender.py, drip_campaign.py, main.py, prompts/, data/, outputs/, state.json)
- ${BROCHURE}\\Patient Navigator
- ${BROCHURE}\\carcinome_wpp
- ${DESKTOP}\\Sorted\\Docs  (esp. Horizon_June_Campaign_Brief.docx, 12_June_Event_Email_Timeline_Content_Draft_Docx.docx, 27_June_Event_Email_Timeline_Content_Draft_Docx.docx, and the agenda PDFs)
- ${DESKTOP}\\Webinar_Email_Marketing_Playbook_Three_Audience_Flows.docx
- ${DESKTOP}\\Sorted\\postmark_email_automation_zoom_filtering
- ${DESKTOP}\\horizon-clean.csv and "${DESKTOP}\\5000 Email Database for Horizon - Sheet1.csv" (read the HEADER and a few rows only, plus a row count; do NOT dump personal data, do NOT include real email addresses in your answer)

.docx files are zip archives: unzip -p "file.docx" word/document.xml | sed -e 's/<[^>]*>/ /g' gives you the text.

Establish, with file evidence:
- what the offer / event actually is (webinar? brochure? patient navigator service?), the audience (oncologists? patients? caregivers? NGOs?), and the dates
- the exact two emails that were sent: subject lines, structure, CTA, sender identity, sending order and gap
- list size, and any segmentation already in use
- any results captured anywhere (opens, clicks, registrations, replies)
- what tooling actually did the send (JCF-Mailer? postmark? zoho? the python bulk_sender?)
- the existing email timeline documents: summarise the stage sequences they describe

Report list SIZES and column names, never individual contacts. Be explicit in "uncertain" about anything you could not find.`,
    { label: 'ground:campaign-history', phase: 'Ground', schema: CONTEXT_SCHEMA }
  ),

  () => agent(
    `Establish the brand, audience and compliance context for a Jarurat Care (jarurat.care) email campaign.

Read locally first:
- ${BROCHURE}\\index.html, help.html, script.js, style.css (brand voice, colours, what Carcinome is)
- ${BROCHURE}\\articles_jcf (content assets that could be used in nurture emails - list titles)
- ${DESKTOP}\\jcf-founders-office-deck.html (mission, programmes, numbers, positioning - extract the real stats and programme names)
- ${DESKTOP}\\jarurat-mail-ui\\index.html (the platform's own UI language and colour tokens - extract hex colours and font choices)
- "${DESKTOP}\\Amazon SES Request.pdf" if readable (what sending volumes/use case were declared)

Then report:
1. Jarurat Care's mission, programmes, and any concrete numbers (patients served, etc.) usable as proof in copy
2. brand voice rules: this is an Indian cancer-patient support non-profit. What tone is right, what is off-limits (no false hope, no medical claims, no urgency-manipulation on patients)
3. the visual identity: actual hex colours and typefaces found in their files
4. compliance constraints for this campaign: India DPDP Act 2023 consent rules, CAN-SPAM/CASL if any recipients are abroad, medical-communication ethics for mailing doctors vs mailing patients, and what a non-profit must never do in a cancer-related email
5. content assets already on hand that could power a 7-stage nurture flow

Be concrete. Quote actual colours/stats/titles from files. Flag anything you inferred rather than read.`,
    { label: 'ground:brand-and-compliance', phase: 'Ground', schema: CONTEXT_SCHEMA }
  ),
])

const groundBrief = `
### PLATFORM CAPABILITY AUDIT (JCF-Mailer)
${JSON.stringify(caps, null, 1)}

### CAMPAIGN HISTORY / OFFER CONTEXT
${JSON.stringify(history, null, 1)}

### BRAND, AUDIENCE, COMPLIANCE
${JSON.stringify(audience, null, 1)}
`.slice(0, 60000)

log('Grounding complete. Designing cohorts, stages, tests, copy and measurement.')

phase('Design')

const COHORT_SCHEMA = {
  type: 'object',
  properties: {
    preSendCohorts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          definition: { type: 'string', description: 'the rule, in plain English' },
          sqlOrRule: { type: 'string', description: 'concrete rule against the JCF-Mailer data model' },
          estShare: { type: 'string', description: 'expected % of list, with reasoning' },
          whyDifferent: { type: 'string', description: 'why this cohort needs different treatment' },
        },
        required: ['name', 'definition', 'sqlOrRule', 'estShare', 'whyDifferent'],
      },
    },
    behaviouralCohorts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          triggerSignal: { type: 'string' },
          definition: { type: 'string' },
          sqlOrRule: { type: 'string' },
          appearsAfterStage: { type: 'string' },
          whyDifferent: { type: 'string' },
        },
        required: ['name', 'triggerSignal', 'definition', 'sqlOrRule', 'appearsAfterStage', 'whyDifferent'],
      },
    },
    precedenceRules: { type: 'array', items: { type: 'string' }, description: 'how to resolve someone matching 2+ cohorts, in priority order' },
    exitRules: { type: 'array', items: { type: 'string' }, description: 'what pulls someone out of the flow entirely' },
    teachingNotes: { type: 'array', items: { type: 'string' }, description: 'the lesson a junior marketer should take from this section' },
  },
  required: ['preSendCohorts', 'behaviouralCohorts', 'precedenceRules', 'exitRules', 'teachingNotes'],
}

const STAGE_SCHEMA = {
  type: 'object',
  properties: {
    stages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          number: { type: 'number' },
          name: { type: 'string' },
          purpose: { type: 'string', description: 'the ONE job this stage does' },
          timing: { type: 'string', description: 'relative to campaign start / previous stage, incl. send day+time IST and why' },
          audience: { type: 'string', description: 'which cohorts enter' },
          entryCondition: { type: 'string' },
          exitCondition: { type: 'string' },
          branches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                signal: { type: 'string' },
                measuredHow: { type: 'string', description: 'exactly which JCF-Mailer event/table proves this signal' },
                goesTo: { type: 'string' },
                waitBefore: { type: 'string', description: 'how long to wait before deciding, and why' },
              },
              required: ['signal', 'measuredHow', 'goesTo', 'waitBefore'],
            },
          },
          successMetric: { type: 'string', description: 'primary metric + realistic target number with reasoning' },
          killCriteria: { type: 'string', description: 'when to stop or skip this stage' },
          teachingNote: { type: 'string', description: 'the principle this stage teaches' },
        },
        required: ['number', 'name', 'purpose', 'timing', 'audience', 'entryCondition', 'exitCondition', 'branches', 'successMetric', 'killCriteria', 'teachingNote'],
      },
    },
    flowSummary: { type: 'string', description: 'the whole flow described in one tight paragraph' },
    calendar: { type: 'array', items: { type: 'string' }, description: 'Day N (weekday, IST time): what sends to whom' },
  },
  required: ['stages', 'flowSummary', 'calendar'],
}

const AB_SCHEMA = {
  type: 'object',
  properties: {
    tests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          stage: { type: 'string' },
          hypothesis: { type: 'string', description: 'Because X, we believe Y will cause Z, measured by M' },
          variantA: { type: 'string' },
          variantB: { type: 'string' },
          primaryMetric: { type: 'string' },
          guardrailMetric: { type: 'string', description: 'what must NOT get worse (e.g. unsub rate, complaint rate)' },
          sampleSizeMath: { type: 'string', description: 'baseline rate, MDE, n per arm, and whether the real list is big enough - show the arithmetic' },
          verdict: { type: 'string', enum: ['run-it', 'list-too-small-run-as-sequential-learning', 'skip'] },
          decisionRule: { type: 'string', description: 'exactly what you do at what threshold' },
        },
        required: ['id', 'stage', 'hypothesis', 'variantA', 'variantB', 'primaryMetric', 'guardrailMetric', 'sampleSizeMath', 'verdict', 'decisionRule'],
      },
    },
    honestLimits: { type: 'array', items: { type: 'string' }, description: 'where A/B testing on a list this size is theatre rather than evidence - say it plainly' },
    teachingNotes: { type: 'array', items: { type: 'string' } },
  },
  required: ['tests', 'honestLimits', 'teachingNotes'],
}

const COPY_SCHEMA = {
  type: 'object',
  properties: {
    emails: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          stage: { type: 'string' },
          cohort: { type: 'string' },
          variant: { type: 'string', description: 'A, B, or single' },
          fromName: { type: 'string' },
          subject: { type: 'string' },
          preheader: { type: 'string' },
          bodyMarkdown: { type: 'string', description: 'the full email body, ready to send, with {{merge_tokens}} in the platform syntax' },
          cta: { type: 'string' },
          wordCount: { type: 'number' },
          craftNote: { type: 'string', description: 'why this email is written this way - the teaching point' },
        },
        required: ['stage', 'cohort', 'variant', 'fromName', 'subject', 'preheader', 'bodyMarkdown', 'cta', 'wordCount', 'craftNote'],
      },
    },
  },
  required: ['emails'],
}

const MEASURE_SCHEMA = {
  type: 'object',
  properties: {
    metrics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          metric: { type: 'string' },
          definition: { type: 'string', description: 'exact formula, incl. denominator' },
          source: { type: 'string', description: 'which JCF-Mailer table/endpoint' },
          realisticTarget: { type: 'string' },
          trap: { type: 'string', description: 'how this metric lies, and what to do about it' },
        },
        required: ['metric', 'definition', 'source', 'realisticTarget', 'trap'],
      },
    },
    deliverability: { type: 'array', items: { type: 'string' }, description: 'SPF/DKIM/DMARC, warm-up schedule, throttling, list hygiene, complaint thresholds - concrete numbers' },
    instrumentation: { type: 'array', items: { type: 'string' }, description: 'exactly what to instrument before stage 1 sends, in order' },
    postMortem: { type: 'array', items: { type: 'string' }, description: 'the review ritual after the campaign: questions to answer, in order' },
    teachingNotes: { type: 'array', items: { type: 'string' } },
  },
  required: ['metrics', 'deliverability', 'instrumentation', 'postMortem', 'teachingNotes'],
}

const [cohorts, stages, abtests, measurement] = await parallel([
  () => agent(
    `You are a senior lifecycle-marketing architect designing the cohort model for a Jarurat Care email campaign that will run on their in-house JCF-Mailer platform.

${groundBrief}

Design the COHORT ARCHITECTURE. The critical insight the client wants taught: cohorts do NOT only appear after email 1. Some cohorts exist BEFORE a single email is sent, from list provenance, past behaviour, role, and data quality.

Deliver:
1. preSendCohorts - at least 5 cohorts that exist on day zero, before any send. Think: source of the contact, past engagement history (subscriber.total_opened / total_sent exist), role (oncologist vs patient vs caregiver vs NGO partner), data quality tier from the email verifier, prior-event attendees, and cold-never-mailed. Give each a concrete rule against the actual data model from the audit.
2. behaviouralCohorts - at least 8 that emerge as the flow runs. Cover: opened-not-clicked, clicked-not-registered, registered, replied (and reply sentiment: interested / question / not-now / unsubscribe-by-reply), hard-bounced, soft-bounced-repeatedly, complained, MPP-machine-open-only (the platform HAS an OpenClassifier - use it, and explain why a "machine open" cohort must never be treated as engagement), serial-opener-never-converts, and late-engager.
3. precedenceRules - strict priority order for someone matching several cohorts at once. Negative signals must outrank positive ones.
4. exitRules - what removes someone from the flow permanently.
5. teachingNotes - the lessons for a junior marketer.

Every rule must be expressible against the tables in the audit. If a rule needs a field that does not exist, say so explicitly in the rule text as "NEEDS: <field>".`,
    { label: 'design:cohort-architecture', phase: 'Design', schema: COHORT_SCHEMA }
  ),

  () => agent(
    `You are a senior lifecycle-marketing architect. Design the STAGE ARCHITECTURE for a Jarurat Care campaign on their in-house JCF-Mailer platform.

${groundBrief}

The client currently sends a 2-email campaign. Stretch it into a proper flow of AT LEAST 7 stages (8 or 9 if the logic genuinely calls for it - do not pad). This must be a teaching artefact for a marketing team, so every stage must justify its existence.

Requirements:
- Stage 1 must itself already be cohort-differentiated (different cohorts get different first emails), not one blast.
- Every stage after 1 must branch on a signal that the platform can actually measure - name the table/endpoint.
- Include a reply-handling stage: replies are the highest-value signal and must route to a human, with a suggested SLA.
- Include at least one stage that is deliberately NOT a promotion: pure value/give, no ask. Explain why that is what makes the ask at the next stage work.
- Include a re-engagement or last-chance stage, and a graceful sunset stage for the unresponsive that protects sender reputation.
- Include a post-event stage: attendees vs registered-no-shows are different cohorts and must get different mail.
- Timing must be specific: day offsets, IST send times, and the reason for each choice given an Indian clinician/caregiver audience.
- Every stage needs killCriteria - a marketing team must know when NOT to send.
- Targets must be realistic for a non-profit healthcare list in India, not aspirational SaaS benchmarks. Say what a good number actually is.

Also give a day-by-day calendar of the whole flow.`,
    { label: 'design:stage-architecture', phase: 'Design', schema: STAGE_SCHEMA }
  ),

  () => agent(
    `You are an experimentation lead. Design the A/B TESTING PROGRAMME for a multi-stage Jarurat Care email campaign.

${groundBrief}

Design at least 8 tests spread across the stages. Cover a range of test types, not just subject lines: sender identity (person vs organisation), subject line framing, send time, email length (short vs long), CTA style (button vs plain link vs reply-request), personalisation depth, social proof vs mission framing, plain-text vs designed HTML, and one test on the follow-up gap length.

For EVERY test you must do the sample-size arithmetic explicitly. Use the real list size established in the grounding brief (if unknown, state the assumption and give the answer for a few list sizes: 500, 2,000, 5,000). Baseline open rate for non-profit healthcare email is roughly 25-35%, click rate roughly 2-4%. For a two-arm test with a 5-percentage-point MDE at 80% power you need on the order of a few hundred to a couple of thousand per arm depending on baseline - do the actual calculation and show it.

Be brutally honest in honestLimits: on a small list, most subject-line A/B tests cannot reach significance, and calling a 2-point difference a "winner" is noise-chasing. Say exactly which of your own proposed tests fall into that trap, and give the alternative: sequential learning across sends, holdout groups, and directional tests with pre-registered decision rules.

Also note: the platform has NO native A/B split assignment (check the audit). Specify how to bucket deterministically - e.g. a stable hash of the subscriber id - so buckets are reproducible and a person stays in the same arm across stages.`,
    { label: 'design:ab-testing-programme', phase: 'Design', schema: AB_SCHEMA }
  ),

  () => agent(
    `You are a deliverability and analytics lead. Design the MEASUREMENT AND DELIVERABILITY plan for a 7-stage Jarurat Care email campaign on JCF-Mailer (Amazon SES backed).

${groundBrief}

Deliver:
1. metrics - the metric set per stage, each with an exact formula including denominator (delivered vs sent matters), the JCF-Mailer source table/endpoint, a realistic target for Indian non-profit healthcare email, and the TRAP: how the metric lies. Cover at minimum: delivery rate, true open rate net of Apple MPP machine opens (the platform has an OpenClassifier - explain how to use it and why raw open rate is now a broken metric), click-to-open rate, click-to-registration conversion, reply rate, unsubscribe rate, complaint rate, list churn, and cohort-level lift vs holdout.
2. deliverability - concrete: SPF/DKIM/DMARC posture, SES warm-up ramp with actual daily volume numbers, per-hour throttle, the complaint rate ceiling SES enforces (0.1% warning / 0.5% at-risk) and bounce ceiling (5%), list hygiene using their own EmailVerifier, and what to do when a stage's bounce rate spikes mid-send.
3. instrumentation - the ordered checklist of what must be wired up BEFORE stage 1 sends. Include: a holdout group, UTM conventions, a registration callback so the platform knows who converted, reply ingestion, and per-variant tagging.
4. postMortem - the review ritual after the campaign, as an ordered list of questions.
5. teachingNotes.

Every number must be defensible. Where you are estimating, say so.`,
    { label: 'design:measurement-deliverability', phase: 'Design', schema: MEASURE_SCHEMA }
  ),
])

log('Architecture set. Writing the actual email copy against the stage plan.')

const stageBrief = JSON.stringify(stages, null, 1).slice(0, 40000)
const cohortBrief = JSON.stringify(cohorts, null, 1).slice(0, 25000)
const abBrief = JSON.stringify(abtests, null, 1).slice(0, 20000)

const copyPrompt = (range, extra) => `You are a senior copywriter for an Indian cancer-support non-profit, Jarurat Care. Write the ACTUAL, ready-to-send email copy.

BRAND + AUDIENCE + COMPLIANCE:
${JSON.stringify(audience, null, 1).slice(0, 15000)}

OFFER / CAMPAIGN CONTEXT:
${JSON.stringify(history, null, 1).slice(0, 12000)}

COHORTS:
${cohortBrief}

STAGE PLAN:
${stageBrief}

A/B VARIANTS REQUIRED:
${abBrief}

Write every email for ${range}. ${extra}

Rules:
- Real copy, not placeholders. No "[insert benefit here]". If a fact is unknown, use a clearly-marked {{merge_token}} or a bracketed <FILL: specific thing> so the team knows exactly what to supply.
- Use the merge-token syntax the platform actually uses (see the stage plan / audit; if unclear use {{first_name}} style and say so).
- Tone: warm, plain, specific, human. This is a cancer non-profit - no hype, no manufactured urgency aimed at patients, no medical claims, no false hope.
- Subject lines under 50 characters where possible. Write a real preheader for each, never a repeat of the subject.
- Different cohorts get genuinely different emails, not the same email with a swapped first line. A re-send to a non-opener must have a different subject AND a different angle.
- Where the stage plan calls for an A/B variant, write BOTH variants in full.
- Keep most emails under 150 words. The value/give email may run longer.
- Every email needs a craftNote: the specific technique used and why, so a junior marketer learns from it.

CRITICAL: never use em dashes or en dashes anywhere in the copy or notes. Only plain hyphens. Restructure the sentence if a hyphen reads badly.`

const [copy1, copy2] = await parallel([
  () => agent(copyPrompt('STAGES 1 THROUGH 4', 'Cover every cohort branch in those stages, including the non-opener resend and the reply-handler responses.'),
    { label: 'copy:stages-1-4', phase: 'Design', schema: COPY_SCHEMA }),
  () => agent(copyPrompt('STAGES 5 THROUGH THE END OF THE FLOW', 'Cover every cohort branch, including the value/give email, last-chance, post-event attendee vs no-show, and the graceful sunset email.'),
    { label: 'copy:stages-5-end', phase: 'Design', schema: COPY_SCHEMA }),
])

const allEmails = [...(copy1?.emails || []), ...(copy2?.emails || [])]
log(`${allEmails.length} emails written. Verifying feasibility and completeness.`)

phase('Verify')

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          where: { type: 'string' },
          problem: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['severity', 'where', 'problem', 'fix'],
      },
    },
    verdict: { type: 'string' },
  },
  required: ['issues', 'verdict'],
}

const designBrief = `
COHORTS: ${cohortBrief}
STAGES: ${stageBrief}
A/B: ${abBrief}
MEASUREMENT: ${JSON.stringify(measurement, null, 1).slice(0, 20000)}
EMAIL COUNT: ${allEmails.length}
EMAIL INDEX: ${JSON.stringify(allEmails.map(e => ({ stage: e.stage, cohort: e.cohort, variant: e.variant, subject: e.subject })), null, 1).slice(0, 12000)}
`.slice(0, 90000)

const [feasibility, completeness, honesty] = await parallel([
  () => agent(
    `Adversarially check this campaign design against what the JCF-Mailer platform can ACTUALLY do. Read the source yourself at ${MAILER}\\src\\main\\java\\com\\jarurat\\mailer - do not trust the audit blindly.

PLATFORM AUDIT (verify it):
${JSON.stringify(caps, null, 1).slice(0, 30000)}

THE DESIGN:
${designBrief}

Find every place where the design assumes a capability the platform does not have, or misnames an endpoint, table, or field. For each, give the minimal concrete fix: either the manual workaround the marketing team runs today, or the specific code change (class, table, endpoint) that makes it automatic. Default to skeptical: if you cannot find the code that does something, it does not exist.`,
    { label: 'verify:platform-feasibility', phase: 'Verify', schema: VERIFY_SCHEMA }
  ),

  () => agent(
    `You are the head of marketing reviewing this campaign playbook before it is taught to a junior team. Be demanding.

${designBrief}

Find what is MISSING or WRONG:
- Is any stage doing two jobs at once, or existing only to hit the number seven?
- Is there a cohort that gets orphaned - enters a branch with no email written for it? Check the email index against the cohort list and stage branches, and name any gap explicitly.
- Are the timings realistic for Indian oncologists and caregivers? Is anything sending at a stupid hour or on a bad weekday?
- Does anything risk annoying a cancer patient or a bereaved family member? Flag every place the flow could reach someone for whom this message would land badly, and what the safeguard is.
- Is the "reply" path actually staffed, with a named owner and SLA?
- Would a junior marketer be able to execute this on Monday morning from this document alone? What would they get stuck on?
- What is the single weakest stage, and what should replace it?`,
    { label: 'verify:marketing-critique', phase: 'Verify', schema: VERIFY_SCHEMA }
  ),

  () => agent(
    `You are a skeptical analyst. Hunt for over-claiming and made-up numbers in this campaign plan.

${designBrief}

Flag every: benchmark stated without a source, conversion target that is optimistic for an Indian non-profit healthcare list, A/B test claimed as valid that cannot reach statistical significance at the stated list size (redo the arithmetic yourself), and any claim that the platform will do something automatically when it will really need a person running a CSV. Also flag any place the plan quietly assumes the list is bigger, cleaner, or more consented than the grounding evidence supports.

For each, give the honest replacement number or the honest caveat sentence. Default to refuting: if a number has no basis, say so.`,
    { label: 'verify:numbers-honesty', phase: 'Verify', schema: VERIFY_SCHEMA }
  ),
])

log('Verification done. Synthesising the final playbook.')

phase('Synthesize')

const allIssues = [feasibility, completeness, honesty].filter(Boolean).flatMap(r => r.issues || [])

const final = await agent(
  `Assemble the definitive Jarurat Care campaign playbook. This is a TEACHING document for a marketing team plus an EXECUTION spec for the operator running JCF-Mailer.

GROUNDING:
${groundBrief.slice(0, 40000)}

DESIGN:
${designBrief}

FULL EMAIL COPY:
${JSON.stringify(allEmails, null, 1).slice(0, 120000)}

REVIEW ISSUES TO RESOLVE (apply the fixes, do not just list them):
${JSON.stringify(allIssues, null, 1).slice(0, 30000)}

Produce a single coherent playbook in Markdown with these sections:
1. The one-page summary: what changes from the 2-email blast to this flow, and the honest expected gain.
2. The platform: what JCF-Mailer already does, what must be built first, in priority order with effort.
3. Cohort model: pre-send cohorts AND behavioural cohorts, with precedence and exit rules. Make the "cohorts exist before email 1" lesson explicit and prominent.
4. The stage-by-stage flow: every stage with purpose, timing, audience, branches, metric, kill criteria, teaching note.
5. The branch map: describe the full flow as a mermaid flowchart, correct mermaid syntax, readable, using the real cohort and stage names.
6. The A/B programme, including the honest limits section.
7. Every email, in full, grouped by stage, labelled by cohort and variant.
8. Measurement and deliverability.
9. The Monday-morning runbook: an ordered checklist the operator executes, with the actual endpoints and manual workarounds.
10. Ten lessons for the marketing team.

Apply every fix from the review. Where a review issue says a number is unfounded, use the honest number. Where it says a capability is missing, say plainly that it needs a person or needs building.

CRITICAL FORMATTING RULE: never use em dashes or en dashes anywhere. Only plain hyphens. Restructure sentences if needed.

Return the complete Markdown document as your final text. Be thorough: this is the deliverable.`,
  { label: 'synthesize:playbook', phase: 'Synthesize' }
)

return {
  playbook: final,
  raw: { caps, history, audience, cohorts, stages, abtests, measurement, emails: allEmails, issues: allIssues },
}
