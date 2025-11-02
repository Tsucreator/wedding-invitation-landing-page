/*
 Minimal AWS Lambda handler (Node.js) to receive RSVP POST and send an email via SES.
 Usage:
 - Deploy to Lambda with environment variables: SENDER_EMAIL, RECEIVER_EMAIL
 - Requires IAM permissions: ses:SendEmail
*/

const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const REGION = process.env.AWS_REGION || 'us-east-1';
const SENDER = process.env.SENDER_EMAIL || process.env.SES_SENDER;
const RECEIVER = process.env.RECEIVER_EMAIL || process.env.SES_RECEIVER;

const ses = new SESClient({ region: REGION });

exports.handler = async (event) => {
  try {
    const body = (typeof event.body === 'string') ? JSON.parse(event.body) : event.body;
    if(!body) throw new Error('Missing body');

    const name = body.name || '（未指定）';
    const kana = body.kana || '';
    const attendance = body.attendance || '未選択';
    const email = body.email || '（未指定）';
    const allergy = body.allergy || '';
    const message = body.message || '';

    if(!SENDER || !RECEIVER) {
      return { statusCode: 500, body: JSON.stringify({ error: 'SENDER_EMAIL and RECEIVER_EMAIL env vars must be set' }) };
    }

    const subject = `RSVP: ${name} - ${attendance}`;
    const textBody = `出欠回答が届きました\n\nお名前: ${name}\nふりがな: ${kana}\n出欠: ${attendance}\nメール: ${email}\nアレルギー: ${allergy}\nメッセージ: ${message}`;

    const params = {
      Destination: { ToAddresses: [RECEIVER] },
      Message: {
        Body: { Text: { Data: textBody } },
        Subject: { Data: subject }
      },
      Source: SENDER
    };

    await ses.send(new SendEmailCommand(params));

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Error in Lambda:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'unknown' }) };
  }
};
