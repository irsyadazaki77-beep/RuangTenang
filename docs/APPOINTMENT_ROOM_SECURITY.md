# Appointment room security deployment notes

Room admission uses the persisted UTC `scheduledAt` value, strict `CONFIRMED`/`IN_PROGRESS` plus `APPROVED` state, participant identity, and server clock on every room endpoint. The public request does not accept a clock override. ICE credentials are issued only after the same eligibility check; TURN credentials are ephemeral when `TURN_SHARED_SECRET` is configured.

Appointment SSE notifications, WebRTC signaling, and room presence are currently held in process-local memory. Deployments must run a single application instance with sticky routing for the lifetime of a room. Multi-instance deployment is not supported until these maps and appointment event delivery move to the existing Redis-backed distributed infrastructure. Do not scale this service horizontally before that change.
