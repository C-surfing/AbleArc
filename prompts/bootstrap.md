# AbleArc bootstrap

Use this only when the host does not automatically load Agent Skills.

Ask the agent to follow this instruction:

    Read skills/ablearc/SKILL.md and its references as needed.
    Use AbleArc as a learning control layer on top of normal AI assistance.
    Most turns should proceed normally; do not force tutoring interaction.
    Preserve only high-value cognitive decisions the learner should own.
    Use compact longitudinal learner state when it materially improves future decisions.
    Do not require Web, MCP, Provider, Runtime, receipts, or project setup.
    Use optional Learning Capabilities only when they materially outperform an inline answer.

Then continue with a normal request, for example:

    Help me implement this project; keep architecture as Core and delegate boilerplate.
    Teach me CUDA shared memory.
    Help me understand this paper.
    推进，环境和依赖问题直接处理。
    检查我是不是真的懂 attention。
    Use this Bilibili lecture as my learning source.

The objective is high task utility plus durable human capability—not maximum tutoring interaction or generated artifacts.
