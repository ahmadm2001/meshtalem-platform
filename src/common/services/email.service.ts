import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OrderEmailData {
  orderId: string;
  guestEmail?: string;
  customerEmail?: string;
  guestName?: string;
  customerName?: string;
  total: number;
  items: Array<{
    productNameHe: string;
    quantity: number;
    priceAtPurchase: number;
  }>;
  shippingCity?: string;
  shippingStreet?: string;
  trackingUrl: string;
}

export interface StatusEmailData {
  orderId: string;
  email: string;
  customerName: string;
  status: string;
  trackingUrl: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'התקבלה ההזמנה',
  confirmed: 'ההזמנה אושרה',
  processing: 'ההזמנה בהכנה',
  shipped: 'ההזמנה נשלחה ובדרך אליך',
  delivered: 'ההזמנה נמסרה',
  cancelled: 'ההזמנה בוטלה',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  processing: '#6366f1',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: any = null;
  private readonly fromEmail: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'משתלם <noreply@meshtalem.com>');
    this.baseUrl = this.configService.get<string>('STORE_URL', 'http://localhost:3001');

    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Resend } = require('resend');
        this.resend = new Resend(apiKey);
        this.logger.log('Email service initialized with Resend');
      } catch (e) {
        this.logger.warn('Resend package not available, emails will be logged only');
      }
    } else {
      this.logger.warn('RESEND_API_KEY not set – emails will be logged only');
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[EMAIL LOG] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err?.message}`);
    }
  }

  async sendOrderConfirmation(data: OrderEmailData): Promise<void> {
    const email = data.guestEmail || data.customerEmail;
    if (!email) return;

    const name = data.guestName || data.customerName || 'לקוח יקר';
    const shortId = data.orderId.slice(0, 8).toUpperCase();

    const itemsHtml = data.items
      .map(
        (item) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${item.productNameHe}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:left;">₪${(item.priceAtPurchase * item.quantity).toFixed(2)}</td>
        </tr>`,
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="background:#16a34a;padding:28px 32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">משתלם</h1>
          <p style="color:#dcfce7;margin:6px 0 0;font-size:14px;">אישור הזמנה</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="color:#111827;margin:0 0 8px;font-size:20px;">שלום ${name},</h2>
          <p style="color:#6b7280;margin:0 0 24px;font-size:15px;">ההזמנה שלך התקבלה בהצלחה! אנחנו כבר מטפלים בה.</p>
          
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">מספר הזמנה: #${shortId}</p>
          </div>

          <h3 style="color:#374151;font-size:16px;margin:0 0 12px;">פרטי ההזמנה</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 12px;text-align:right;font-size:13px;color:#6b7280;font-weight:600;">מוצר</th>
                <th style="padding:10px 12px;text-align:center;font-size:13px;color:#6b7280;font-weight:600;">כמות</th>
                <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;">סכום</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr style="background:#f9fafb;">
                <td colspan="2" style="padding:12px;text-align:right;font-weight:700;color:#111827;">סה"כ לתשלום:</td>
                <td style="padding:12px;text-align:left;font-weight:700;color:#16a34a;font-size:16px;">₪${data.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="text-align:center;margin:28px 0;">
            <a href="${data.trackingUrl}" style="background:#16a34a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">
              עקוב אחר ההזמנה שלך
            </a>
          </div>

          <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">תודה שקנית במשתלם!</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">© 2025 משתלם. כל הזכויות שמורות.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.send(email, `אישור הזמנה #${shortId} - משתלם`, html);
  }

  async sendStatusUpdate(data: StatusEmailData): Promise<void> {
    if (!data.email) return;

    const shortId = data.orderId.slice(0, 8).toUpperCase();
    const statusLabel = STATUS_LABELS[data.status] || data.status;
    const statusColor = STATUS_COLORS[data.status] || '#6b7280';

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:#16a34a;padding:28px 32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">משתלם</h1>
          <p style="color:#dcfce7;margin:6px 0 0;font-size:14px;">עדכון סטטוס הזמנה</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="color:#111827;margin:0 0 8px;font-size:20px;">שלום ${data.customerName},</h2>
          <p style="color:#6b7280;margin:0 0 24px;font-size:15px;">יש עדכון חדש לגבי הזמנה <strong>#${shortId}</strong>:</p>

          <div style="background:${statusColor}15;border:2px solid ${statusColor};border-radius:10px;padding:20px;text-align:center;margin-bottom:28px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:${statusColor};">${statusLabel}</p>
          </div>

          <div style="text-align:center;margin:28px 0;">
            <a href="${data.trackingUrl}" style="background:#16a34a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">
              לצפייה בפרטי ההזמנה
            </a>
          </div>

          <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">תודה שקנית במשתלם!</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">© 2025 משתלם. כל הזכויות שמורות.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.send(data.email, `עדכון הזמנה #${shortId}: ${statusLabel} - משתלם`, html);
  }
}
