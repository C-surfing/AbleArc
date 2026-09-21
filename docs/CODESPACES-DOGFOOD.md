# GitHub Codespaces Web dogfooding

AbleArc can be opened in a disposable/private GitHub Codespace for real first-party Web use without installing Node or Python locally.

## Start

Open:

`https://codespaces.new/C-surfing/AbleArc?quickstart=1`

GitHub will create a Codespace from the default branch. The repository devcontainer then:

1. installs Node 22 and Python 3.11;
2. installs `apps/workspace` dependencies;
3. runs `python tools/learning.py doctor`;
4. starts the Web Host on port 3000;
5. asks Codespaces to auto-open the forwarded **AbleArc Web** port.

Forwarded Codespaces ports are private by default. Do not make the port public when using a real Provider key or private learner state.

## First use

On the first Web open:

1. use **Model Setup**;
2. select/configure the OpenAI-compatible Provider;
3. enter the API key in the graphical setup;
4. run the compatibility check;
5. create a real Project from **What's worth understanding?**;
6. continue through Today → Focus.

Provider settings are stored in the Git-ignored `.ablearc-local/` directory inside that Codespace. Learner state remains in the repository workspace under the existing local-first boundaries.

## Restart

The Web server is started by `.devcontainer/start-web.sh` on Codespace start. If needed, run:

```bash
bash .devcontainer/start-web.sh
```

Logs:

```bash
tail -f /tmp/ablearc-web.log
```

## Scope

This is a dogfooding launcher, not a cloud persistence architecture and not a production multi-user deployment. It deliberately does not introduce hosted learner truth, remote Runtime authority, or a second persistence model.
