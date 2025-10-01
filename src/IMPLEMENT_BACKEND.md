You are to implement a production-ready REST API for AutoPrint using Node.js, Express, Sequelize (Postgres) and AWS S3 for document storage. Requirements:

1) Models (Sequelize): User, Document, Payment, PrintJob (fields as in DB schema previously provided).
2) Auth: JWT-based login/register. Middleware: auth required for user endpoints, admin role for admin endpoints.
3) API endpoints (implement all described in API spec): 
   - POST /api/documents (multipart upload) -> validate file types, save file to S3, store DB record.
   - POST /api/print_jobs -> create job with status 'awaiting_payment' and return payment instructions (bkash number + QR image URL).
   - POST /api/payments/submit -> create payment record 'pending'.
   - GET /api/payments/pending -> admin only
   - POST /api/payments/verify -> admin only; verifies a tx_id, sets payment.status='verified', generates UPID (8 char), links to print_job, sets print_job.status='queued', assigns queue_pos atomically.
   - GET /api/queue/status/:user_id -> returns user's position and next few jobs.
   - POST /api/queue/confirm -> body {upid, user_id} -> validate and set job.status='printing' and return print metadata.
   - GET /api/print/fetch?upid=... -> Checks API KEY header for Raspi; returns signed S3 URL and print metadata; marks job printing.
   - POST /api/print/complete -> marks job printed, triggers document deletion job (or schedules deletion after N minutes), returns success.

4) Implement a queue worker (node-cron or bull queue using Redis) that:
   - monitors queued jobs and sets the 'current' job to 'waiting_for_confirm', pushes WS/push notification, and enforces the 5-second confirmation timeout. If timeout, moves job down 5 positions atomically.
   - compacts queue positions periodically to keep positions small.

5) Real-time: add a WebSocket (socket.io) pushing current_pos and next 5 entries.

6) Security:
   - Validate unique tx_id on submit.
   - Rate-limit confirmation endpoint.
   - Enforce single-use UPID.

7) Tests: jest unit tests for UPID generation, queue skip logic, and the payment verification flow.

8) Extra: Add docs for admin manual verification UI endpoints and example cURL for Raspi fetch with API key.
