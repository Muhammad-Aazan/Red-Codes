import nodemailer from 'nodemailer'

const SMTP_USER = process.env.SMTP_USER || 'developermuhammadaazan@gmail.com'
const SMTP_PASS = process.env.SMTP_PASS || 'xjiawiwivhrjbajy'

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  }

  async sendOtpEmail(toEmail: string, otpCode: string, userName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const recipientName = userName?.trim() || 'RED CODES User'
      
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RED CODES Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090D16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #090D16; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #111827; border: 1px solid #1F2937; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 30px 40px 20px 40px; background: linear-gradient(180deg, #1E1B4B 0%, #111827 100%); border-bottom: 1px solid #1F2937;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: #DC2626; color: #FFFFFF; font-weight: 900; font-size: 16px; width: 34px; height: 34px; line-height: 34px; text-align: center; border-radius: 8px; box-shadow: 0 0 15px rgba(220, 38, 38, 0.5);">
                      R
                    </div>
                    <span style="font-size: 18px; font-weight: 800; letter-spacing: 1.5px; color: #FFFFFF; margin-left: 12px; vertical-align: middle;">
                      RED CODES
                    </span>
                    <span style="display: inline-block; margin-left: 10px; padding: 3px 8px; background-color: rgba(220, 38, 38, 0.15); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 6px; font-size: 10px; font-weight: 700; color: #EF4444; letter-spacing: 1px; vertical-align: middle;">
                      SECURITY LAUNCHER
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 35px 40px 25px 40px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #FFFFFF;">
                One-Time Verification Code
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94A3B8;">
                Hello <strong style="color: #F1F5F9;">${recipientName}</strong>,<br>
                Use the following 6-digit code to verify your email and activate your secure RED CODES workspace & Ghost Vault:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
                <tr>
                  <td align="center" style="background-color: #0B0F19; border: 2px dashed #DC2626; border-radius: 14px; padding: 22px 10px;">
                    <span style="display: block; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #EF4444; text-transform: uppercase; margin-bottom: 8px;">
                      Your Security OTP
                    </span>
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #FFFFFF; text-shadow: 0 0 20px rgba(220, 38, 38, 0.6); padding-left: 12px;">
                      ${otpCode}
                    </span>
                    <span style="display: block; font-size: 11px; color: #64748B; margin-top: 8px;">
                      Valid for 10 minutes • Single-use only
                    </span>
                  </td>
                </tr>
              </table>

              <div style="background-color: rgba(30, 41, 59, 0.5); border-left: 3px solid #DC2626; border-radius: 6px; padding: 12px 16px; margin: 25px 0 10px 0;">
                <p style="margin: 0; font-size: 12px; color: #CBD5E1; line-height: 1.5;">
                  <strong>Security Notice:</strong> Never share this code with anyone. RED CODES will never ask for your verification code or Master PIN.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #0B0F19; border-top: 1px solid #1F2937; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748B;">
                Automated security notification from RED CODES Desktop App.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                If you did not initiate this request, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `

      const mailOptions = {
        from: `"RED CODES Security" <${SMTP_USER}>`,
        to: toEmail,
        subject: `🔐 RED CODES Verification Code: ${otpCode}`,
        text: `Hello ${recipientName},\n\nYour RED CODES verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\nNever share this code with anyone.`,
        html: htmlContent,
      }

      const info = await this.transporter.sendMail(mailOptions)
      console.log(`[EmailService] OTP email sent to ${toEmail}. MessageId: ${info.messageId}`)
      return { success: true }
    } catch (err: any) {
      console.error('[EmailService] Failed to send OTP email:', err)
      return { success: false, error: err.message || 'Failed to dispatch email' }
    }
  }
}
