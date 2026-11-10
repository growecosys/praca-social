# Praça: UI review, 2026-11-01

Reviewed the source for Home, Mural, post, post history, editor (create/edit), account entry, recovery, profile completion, own/public profile, leaderboard, Connections (people/circles/pending/history), circle creation/detail, Common Space and legacy login/poke redirects.

Implemented shared navigation (including editor), explicit text labels for mobile navigation and publish, a secondary menu with logout at every width, predictable return links, draft-preserving editor exit, undo after block deletion, collapsible block options and identity history, selected Connections tabs and collapsible statistics. Account entry uses the shared header, clearer tabs and smaller introductory type. Recovery has an associated account label, keyboard submission, password label and a back step. Circle creation has cancellation; sensitive membership/state actions have an inline confirmation with cancel. Image proposal and post-image dialogs expose explicit footer exits. Generation dialogs trap keyboard focus, support Escape when idle and restore focus. Global focus styling and mobile touch/input sizing apply throughout.

No schema, quota, generation model, voting or authentication policy changes.

Validation: production build passes. Eight existing tests pass; the existing rendered-worker test cannot import cloudflare:workers under the plain Node loader. Standalone TypeScript check also encounters existing Cloudflare runtime type errors and pre-existing guide/role type errors. Browser preview verifies public Home/navigation and recovery labels. Authenticated actions and paid image generation are not exercised against real user accounts.

Rollback: saved production version 58 and source b62143d242a0b9054e0595dca83b7cad8fc06010 remain available.
