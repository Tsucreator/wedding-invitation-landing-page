## Copilot / AI agent instructions for this repository

This repository currently contains a requirements/spec document (`README.md`) describing a wedding invitation landing page and an AWS serverless deployment (S3 + CloudFront for the static site; API Gateway -> Lambda -> SES for form handling).

Keep guidance short and actionable. Focus on the concrete shapes, files, and flows called out in `README.md`.

Key project facts (from `README.md`):
- Purpose: static landing page (invitation) with an RSVP form and an optional password-protection.
- Frontend: static files (HTML/CSS/JS/images). Mobile-first, responsive, image-optimized (WebP preferred), lazy-loaded assets.
- Form: "出欠回答フォーム" with fields: お名前, ふりがな, ご出席/ご欠席, メールアドレス, アレルギー, メッセージ. Form submits via POST to an AWS API Gateway endpoint.
- Backend infra (expected): API Gateway -> Lambda (process) -> SES (email notification). Storage and CDN: S3 + CloudFront.

What to do first when contributing or editing code:
- Read `README.md` to see exact UX and form-field requirements (validation rules, required fields, deadline text).
- The repo currently has no code files or build manifests; confirm with the repo owner where frontend sources and config (e.g. `package.json`, build scripts, or `config/*.json`) live before adding or changing infra code.

Agent-specific guidance (concrete and prescriptive):
- When implementing or modifying the RSVP form: use the exact field names and required/optional rules from the README. Example required fields: お名前, ふりがな, ご出席/ご欠席, メールアドレス.
- Client-side validation must check required fields and email format before sending. Keep validation unobtrusive and accessible.
- Form submission should POST JSON to an API endpoint; the README expects the backend to email results via SES. When mocking locally, return the same JSON response shape the Lambda will produce and show the same UI success message: a polite "ご回答ありがとうございます" notice.
- For images: optimize to WebP, provide alt text, and implement lazy-loading. Do not inline large images; use responsive `srcset` where appropriate.
- For maps: README calls for embedding Google Maps via `iframe` — follow that rather than introducing a heavy SDK unless requested.

Architecture & integration notes agents must preserve:
- Do not change the AWS architecture assumptions (S3/CloudFront for static hosting; API Gateway+Lambda+SES for RSVP) without a PR explaining the reasons.
- Password protection (if added) should be implemented client-side or via a lightweight auth check; document any chosen approach and show how the secret/password is provisioned in the deployment.

Tests, builds, and developer workflows (what I found):
- No `package.json`, build scripts, or CI config were present in the repository snapshot. Before adding a build tool, ask where sources are kept and whether the repo should remain a simple static artifact.
- For deployments: follow the README's AWS serverless model — deploy built static files to S3 and invalidate CloudFront if updating publicly served assets.

When you need more info (questions to ask the repo owner):
1. Where are the frontend source files (if not in this repo)? Provide paths or the branch containing them.
2. Is there an existing API Gateway/Lambda implementation or example code to follow (language/runtime)?
3. Preferred deployment pipeline (manual S3 upload, CI/CD, IaC like CloudFormation / CDK / Terraform)?
4. Any constraints for SES (sender address, verified domains) or region requirements?

Files to reference when editing or creating features:
- `README.md` — canonical spec for UX, form fields, and AWS architecture.
- Add new code under clear directories (e.g., `site/` for frontend, `api/` for Lambda functions) and include build manifests (`package.json`, `requirements.txt`, etc.).

Behavioral rules for AI edits:
- Make minimal, focused changes with clear commit messages describing intent.
- When adding an infra or deployment change, include a short README describing how to test locally and how to deploy to AWS.
- Avoid guessing missing details. If something is not in `README.md`, add a short TODO in-code and ask the repo owner rather than making assumptions.

If you want, I can rewrite this into Japanese or expand with example request/response shapes for the RSVP API once you provide the Lambda language/runtime and any existing code.

---
Please review and tell me any missing specifics (source folders, preferred runtime) and I will iterate the instructions.
