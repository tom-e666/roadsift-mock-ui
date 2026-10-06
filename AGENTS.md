# RoadSift mock UI

This repository is an independent, frontend-only interactive prototype. Keep it deployable to Vercel without a backend, secrets, authentication provider, model downloads, or external API calls.

Before UI work, read `.agents/skills/macos-design/SKILL.md` and the relevant files in its `references/` folder. Follow Apple layout, typography, vibrancy, and interaction patterns across every screen.

- All records and metrics are sample data. Keep the persistent demo label visible; simulated training and mining must be explicitly marked.
- Keep sample images bundled locally. Do not import user datasets, credentials, or production results.
- Preserve keyboard access, visible focus, Escape dismissal, modal focus trapping, reduced-motion support, and mobile layouts.
- Run `npm run build`; check the relevant screens in both themes and at narrow widths.
- Do not deploy, push, or publish without a direct user request.
