# RSVP Lambda (SES)

This folder contains a minimal AWS Lambda function (Node.js) that accepts RSVP JSON and sends an email via Amazon SES.

Environment variables required:
- SENDER_EMAIL (the verified SES sender address)
- RECEIVER_EMAIL (destination address to receive RSVP notifications)
- AWS_REGION (optional, defaults to us-east-1)

IAM permissions required for the Lambda role:
- ses:SendEmail

Deploy notes:
- Install dependencies (`npm install`) and package the `node_modules` with the function, or use a bundler.
- Ensure SENDER_EMAIL is a verified identity in SES (or use a domain-verified setup).
- If SES is in sandbox, RECEIVER_EMAIL must be verified as well.

Example payload (POST JSON):
{
  "name": "山田 太郎",
  "kana": "やまだ たろう",
  "attendance": "attend",
  "email": "guest@example.com",
  "allergy": "卵",
  "message": "よろしくお願いします"
}

API Gateway mapping:
- Use a POST method that forwards the body as-is to the Lambda. The Lambda expects JSON in `event.body`.

This file is a minimal example. For production, add input validation, error handling, and rate-limiting as needed.
