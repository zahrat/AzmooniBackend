import { PaymentStatus } from '../../generated/prisma/enums';

type PaymentCallbackPageInput = {
  amountToman: number;
  appReturnUrl: string;
  bookId: number;
  paymentId: number;
  refId: string | null;
  status: PaymentStatus;
};

const STATUS_CONTENT: Record<
  PaymentStatus,
  { accent: string; description: string; symbol: string; title: string }
> = {
  PAID: {
    accent: '#16a34a',
    description: 'پرداخت شما با موفقیت تأیید شد و دسترسی کتاب فعال است.',
    symbol: '✓',
    title: 'پرداخت موفق بود',
  },
  CANCELED: {
    accent: '#f59e0b',
    description: 'پرداخت لغو شد و مبلغی برای این خرید ثبت نشده است.',
    symbol: '×',
    title: 'پرداخت لغو شد',
  },
  PENDING: {
    accent: '#208aef',
    description:
      'نتیجه پرداخت هنوز نهایی نشده است. وضعیت را داخل اپ بررسی کنید.',
    symbol: '…',
    title: 'در انتظار تأیید',
  },
  FAILED: {
    accent: '#dc2626',
    description: 'تأیید پرداخت انجام نشد. می‌توانید داخل اپ دوباره تلاش کنید.',
    symbol: '!',
    title: 'پرداخت تأیید نشد',
  },
  EXPIRED: {
    accent: '#64748b',
    description: 'مهلت این پرداخت به پایان رسیده است. یک پرداخت تازه بسازید.',
    symbol: '×',
    title: 'پرداخت منقضی شد',
  },
};

export function renderPaymentCallbackPage(
  input: PaymentCallbackPageInput,
): string {
  const content = STATUS_CONTENT[input.status];
  const returnUrl = new URL(input.appReturnUrl);
  returnUrl.searchParams.set('paymentId', String(input.paymentId));
  returnUrl.searchParams.set('bookId', String(input.bookId));
  returnUrl.searchParams.set('status', input.status);
  if (input.refId) {
    returnUrl.searchParams.set('refId', input.refId);
  }

  const refIdRow = input.refId
    ? `<div class="detail-row"><span>کد پیگیری</span><strong dir="ltr">${escapeHtml(input.refId)}</strong></div>`
    : '';

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="${content.accent}">
  <title>${content.title} | آزمونی</title>
  <style>
    :root { color-scheme: light; font-family: Tahoma, Arial, sans-serif; }
    * { box-sizing: border-box; }
    body {
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      padding: 24px;
      color: #172033;
      background:
        radial-gradient(circle at 85% 10%, ${content.accent}22 0, transparent 30%),
        radial-gradient(circle at 10% 90%, #208aef18 0, transparent 34%),
        #f6f8fc;
    }
    .shell { width: min(100%, 440px); }
    .brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 18px;
      color: #475569;
      font-size: 14px;
      font-weight: 700;
    }
    .brand-mark {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 11px;
      color: white;
      background: #208aef;
      box-shadow: 0 8px 20px #208aef35;
    }
    .card {
      overflow: hidden;
      border: 1px solid #e4e9f2;
      border-radius: 28px;
      background: rgba(255, 255, 255, .96);
      box-shadow: 0 24px 70px rgba(38, 51, 77, .13);
    }
    .hero {
      position: relative;
      padding: 36px 28px 30px;
      text-align: center;
    }
    .hero::before {
      content: '';
      position: absolute;
      inset: 0 0 auto;
      height: 5px;
      background: ${content.accent};
    }
    .status-icon {
      width: 76px;
      height: 76px;
      display: grid;
      place-items: center;
      margin: 0 auto 22px;
      border: 1px solid ${content.accent}35;
      border-radius: 50%;
      color: ${content.accent};
      background: ${content.accent}12;
      font: 700 42px/1 Arial, sans-serif;
    }
    h1 { margin: 0; font-size: 26px; line-height: 1.5; }
    .description {
      margin: 10px auto 0;
      max-width: 330px;
      color: #64748b;
      font-size: 15px;
      line-height: 1.9;
    }
    .details {
      margin: 0 24px;
      padding: 8px 18px;
      border: 1px solid #e8edf5;
      border-radius: 18px;
      background: #f8fafc;
    }
    .detail-row {
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      border-bottom: 1px solid #e8edf5;
      color: #64748b;
      font-size: 14px;
    }
    .detail-row:last-child { border-bottom: 0; }
    .detail-row strong { color: #172033; font-size: 15px; }
    .actions { padding: 24px; }
    .app-button {
      min-height: 54px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      color: white;
      background: ${content.accent};
      box-shadow: 0 12px 26px ${content.accent}32;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      transition: transform .15s ease, opacity .15s ease;
    }
    .app-button:active { transform: scale(.985); opacity: .9; }
    .hint {
      margin: 14px 0 0;
      color: #94a3b8;
      font-size: 12px;
      line-height: 1.8;
      text-align: center;
    }
    @media (max-width: 420px) {
      body { padding: 16px; }
      .card { border-radius: 24px; }
      .hero { padding-inline: 20px; }
      .details { margin-inline: 16px; }
      .actions { padding: 20px 16px; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <div class="brand"><span class="brand-mark">آ</span><span>آزمونی</span></div>
    <section class="card" aria-labelledby="payment-title">
      <div class="hero">
        <div class="status-icon" aria-hidden="true">${content.symbol}</div>
        <h1 id="payment-title">${content.title}</h1>
        <p class="description">${content.description}</p>
      </div>
      <div class="details">
        <div class="detail-row"><span>مبلغ</span><strong>${formatToman(input.amountToman)} تومان</strong></div>
        <div class="detail-row"><span>شماره پرداخت</span><strong>${formatNumber(input.paymentId)}</strong></div>
        ${refIdRow}
      </div>
      <div class="actions">
        <a class="app-button" href="${escapeHtml(returnUrl.toString())}">بازگشت به اپ آزمونی</a>
        <p class="hint">اگر اپ خودکار باز نشد، دکمه بالا را لمس کنید.</p>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character] ?? character,
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(value);
}

function formatToman(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(value);
}
