# Learning-control dogfooding runbook

Dogfooding should feel like normal AI-assisted work. The evaluation layer observes decisive moments; it must not make the learner operate a protocol.

The central test is not “did AbleArc intervene?” It is “did AbleArc intervene only when the cognitive value justified the interruption?”

## Private evidence

Use .dogfooding/ for private real-session notes when local files are useful. Keep identifiable details, private source material, and raw transcripts out of the public repository.

Usually record a minimized description rather than the full conversation.

## Start an arc

Choose a real capability or project the learner cares about.

Record only what will matter later:

- mission / target capability;
- 1–3 likely Core ownership targets;
- initial frontier hypothesis;
- relevant learner self-report;
- what would count as meaningful later debugging, retrieval, application, or transfer.

Do not pre-fill success.

## During normal work

Use skills/ablearc/SKILL.md normally.

Capture decisive events such as:

- AbleArc correctly chose **continue normally** for Delegate work;
- a learning opportunity was detected and why it was worth interrupting;
- the learner's prediction, hypothesis, explanation, debug decision, or transfer;
- what evidence changed the learner model;
- understanding debt becoming visible;
- an intervention that was too frequent, too weak, or too late;
- whether a Learning Capability was invoked and what problem it solved.

Do not log every exchange.

## Intervention-quality questions

For each meaningful intervention, ask:

1. Would normal direct assistance have been better?
2. Did learner action reveal information that changes future teaching or ownership?
3. Was this one high-information checkpoint, or several low-value questions?
4. Did the intervention preserve a decision the learner actually wants to own?
5. Did the workflow return quickly to the real task?

A good AbleArc session may contain no explicit learning checkpoint at all.

## Across sessions

A later session should use prior evidence when it materially changes the next action.

Prefer opportunities such as:

- delayed retrieval;
- debugging a real failure with an older mental model;
- transfer under a changed constraint;
- reducing scaffold dependence;
- revisiting a recorded misconception when it becomes consequential.

Time passing alone is not evidence of forgetting.

## Learning Capability evaluation

For Archify, ask whether the representation exposed structure the learner could later trace, predict, or reconstruct.

For University Skill, ask whether the topic-first textbook/coursebook became useful reference context for later reasoning.

For youtube-render-pdf / bilibili-render-pdf, ask whether source-faithful notes reduced study friction and supported later explanation, application, comparison, or retrieval.

For learning-by-building, ask whether the learner retained the consequential design/debugging decisions instead of receiving a finished project.

For corpus-to-skill, ask whether it reduced source-navigation overhead without becoming fake learner state.

Artifact quality matters, but artifact existence is not capability evidence.

## Persistence evaluation

When the host already provides project history, test whether an explicit LEARNING_STATE.md adds real value.

A useful state record should compress implications:

- current Core;
- frontier;
- decisive evidence;
- misconceptions;
- understanding debt;
- future retrieval/transfer candidates.

If it merely repeats history, delete or shrink it.

## Promotion gate

Do not add a new general rule to skills/ablearc/SKILL.md because one conversation was awkward.

Prefer a core change when:

1. the failure repeats across independent real sessions; or
2. it is clearly structural and high consequence.

Before promoting it:

- classify the failure;
- test whether stronger host behavior, a clearer adapter, or an existing Learning Capability already solves it;
- add or update a distinguishing scenario in tests/SKILL-BEHAVIOR.md;
- choose the smallest fix.

## Completion

A useful dogfood arc should leave evidence about both sides of the objective:

- task utility remained high;
- human capability improved, stayed stable, or revealed a specific unresolved weakness.

When evidence is insufficient, record uncertainty rather than inventing progress.
