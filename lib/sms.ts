// lib/sms.ts
import debugFactory from "debug";

const debug = debugFactory("pimpay:sms");

type SendSMSOptions = {
  to: string;
  body: string;
};

async function sendViaTwilio({ to, body }: SendSMSOptions) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    throw new Error("Twilio not configured");
  }
  // import dynamically to avoid crash if not installed in some envs
  const Twilio = (await import("twilio")).default;
  const client = Twilio(sid, token);
  const msg = await client.messages.create({ from, to, body });
  debug("twilio sent", msg.sid);
  return msg;
}

export async function sendSMS(to: string, body: string) {
  try {
    // prefer Twilio
    return await sendViaTwilio({ to, body });
  } catch (err) {
    debug("Twilio failed or not configured:", err);
    // add other providers here if needed (e.g., Africa's Talking)
    throw new Error("No SMS provider configured or send failed: " + String(err));
  }
}
