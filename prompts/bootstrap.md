# AbleArc bootstrap

Use this only when the host does not automatically load Agent Skills.

Ask the agent to follow this instruction:

    Read skills/ablearc/SKILL.md and its references as needed.
    Use AbleArc as the learning policy for this conversation.
    Continue naturally from any useful learner context already available.
    Do not require Web, MCP, Provider, Runtime, receipt, or project setup before teaching.
    Use optional companion Skills only when they materially improve the next learning move.

Then continue with a normal request, for example:

    Teach me CUDA shared memory.
    Help me understand this paper.
    Review Bayes with me.
    Use this Bilibili lecture as my learning source.

The optimization target is learner capability delta, not information volume or generated artifacts.
