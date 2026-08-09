import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getEcommerceTrustPage(): string {
    return renderEcommerceTrustPage();
  }
}

function renderEcommerceTrustPage(): string {
  const checks = [
    {
      title: 'هویت و تماس شفاف',
      description:
        'نام صاحب کسب‌وکار، آدرس، شماره تلفن ثابت و موبایل، و ایمیل باید واقعی و قابل بررسی باشند.',
    },
    {
      title: 'صفحات حقوقی کامل',
      description:
        'صفحات «درباره ما»، «تماس با ما»، «قوانین و مقررات»، «حریم خصوصی» و «مرجوعی/لغو سفارش» را اضافه کنید.',
    },
    {
      title: 'فرایند خرید واقعی',
      description:
        'سایت باید امکان ثبت سفارش یا پرداخت آنلاین داشته باشد و قیمت‌ها شفاف و بدون ابهام نمایش داده شوند.',
    },
    {
      title: 'دامنه و مالکیت',
      description:
        'دامنه بهتر است به نام خودتان یا شرکتتان باشد و اطلاعات سایت با مدارک ثبتی هم‌خوانی داشته باشد.',
    },
    {
      title: 'امنیت و HTTPS',
      description:
        'برای دریافت اینماد دو ستاره، سایت باید روی HTTPS اجرا شود و فرم‌ها و پرداخت درست کار کنند.',
    },
  ];

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0f766e">
  <title>آمادگی برای اینماد | آزمونی</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Tahoma, Arial, sans-serif;
      --bg: #f4f7fb;
      --text: #122033;
      --muted: #64748b;
      --line: #dbe4ee;
      --card: rgba(255, 255, 255, 0.92);
      --accent: #0f766e;
      --accent-soft: rgba(15, 118, 110, 0.12);
      --shadow: 0 24px 70px rgba(18, 32, 51, 0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      background:
        radial-gradient(circle at 10% 20%, rgba(15, 118, 110, 0.16) 0, transparent 34%),
        radial-gradient(circle at 90% 10%, rgba(59, 130, 246, 0.12) 0, transparent 30%),
        linear-gradient(180deg, #ffffff 0%, var(--bg) 100%);
    }
    .page {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 28px 0 44px;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 28px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 700;
      color: var(--text);
    }
    .brand-mark {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      color: white;
      background: linear-gradient(135deg, #0f766e, #2563eb);
      box-shadow: 0 14px 28px rgba(15, 118, 110, 0.28);
    }
    .badge {
      padding: 10px 14px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
      background: rgba(255, 255, 255, 0.74);
      font-size: 13px;
    }
    .hero {
      overflow: hidden;
      border: 1px solid rgba(219, 228, 238, 0.8);
      border-radius: 32px;
      background: var(--card);
      box-shadow: var(--shadow);
    }
    .hero-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 28px;
      padding: 34px;
      align-items: center;
    }
    h1 {
      margin: 0;
      font-size: clamp(30px, 5vw, 50px);
      line-height: 1.25;
    }
    .lead {
      margin: 16px 0 0;
      color: var(--muted);
      font-size: 17px;
      line-height: 1.95;
      max-width: 58ch;
    }
    .cta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 24px;
    }
    .button,
    .button-secondary {
      min-height: 48px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 18px;
      border-radius: 14px;
      text-decoration: none;
      font-weight: 700;
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }
    .button {
      color: white;
      background: var(--accent);
      box-shadow: 0 12px 24px rgba(15, 118, 110, 0.22);
    }
    .button-secondary {
      color: var(--text);
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.75);
    }
    .button:hover,
    .button-secondary:hover {
      transform: translateY(-1px);
    }
    .hero-panel {
      padding: 20px;
      border-radius: 24px;
      background:
        linear-gradient(180deg, rgba(15, 118, 110, 0.1), rgba(255, 255, 255, 0.92)),
        white;
      border: 1px solid rgba(15, 118, 110, 0.12);
    }
    .panel-title {
      margin: 0 0 10px;
      font-size: 16px;
    }
    .panel-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 10px;
    }
    .panel-list li {
      padding: 12px 14px;
      border-radius: 16px;
      background: white;
      border: 1px solid #e6edf5;
      color: var(--muted);
      line-height: 1.8;
    }
    .section {
      margin-top: 22px;
      padding: 28px;
      border: 1px solid rgba(219, 228, 238, 0.8);
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 18px 50px rgba(18, 32, 51, 0.08);
    }
    .section h2 {
      margin: 0 0 10px;
      font-size: 24px;
    }
    .section-note {
      margin: 0;
      color: var(--muted);
      line-height: 1.9;
    }
    .checks {
      margin-top: 22px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .check-card {
      padding: 18px;
      border: 1px solid var(--line);
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.96));
    }
    .check-card h3 {
      margin: 0 0 8px;
      font-size: 18px;
    }
    .check-card p {
      margin: 0;
      color: var(--muted);
      line-height: 1.9;
      font-size: 14px;
    }
    .footer-note {
      margin-top: 18px;
      color: #94a3b8;
      font-size: 13px;
      line-height: 1.8;
    }
    @media (max-width: 900px) {
      .hero-grid,
      .checks {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 640px) {
      .page { width: min(100%, calc(100% - 20px)); padding-top: 16px; }
      .topbar { align-items: flex-start; flex-direction: column; }
      .hero-grid { padding: 22px; }
      .section { padding: 22px; }
      .badge { width: fit-content; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">آ</span><span>آزمونی</span></div>
      <div class="badge">راهنمای آمادگی برای اینماد</div>
    </header>

    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-grid">
        <div>
          <h1 id="hero-title">سایت شما برای گرفتن اینماد باید شفاف، واقعی و قابل پیگیری باشد</h1>
          <p class="lead">
            این صفحه یک چک‌لیست عملی است تا قبل از ثبت درخواست اینماد، سایت‌تان از نظر
            اعتماد، اطلاعات تماس، قوانین فروش و زیرساخت فنی آماده باشد.
          </p>
          <div class="cta-row">
            <a class="button" href="#checklist">دیدن چک‌لیست</a>
            <a class="button-secondary" href="mailto:support@example.com">نمونه اطلاعات تماس</a>
          </div>
        </div>
        <aside class="hero-panel" aria-label="خلاصه الزامات">
          <h2 class="panel-title">حداقل چیزهایی که باید داشته باشید</h2>
          <ul class="panel-list">
            <li>دامنه و هویت ثبت‌شده و قابل تطبیق با مدارک</li>
            <li>اطلاعات تماس واقعی و قابل پاسخ‌گویی</li>
            <li>صفحات حقوقی و قوانین خرید</li>
            <li>پرداخت آنلاین یا فرایند سفارش روشن</li>
          </ul>
        </aside>
      </div>
    </section>

    <section class="section" id="checklist" aria-labelledby="checklist-title">
      <h2 id="checklist-title">چک‌لیست آمادگی برای اینماد</h2>
      <p class="section-note">
        هر موردی که پایین‌تر می‌بینید، به‌طور مستقیم به شانس تأیید سایت شما کمک می‌کند.
      </p>
      <div class="checks">
        ${checks
          .map(
            (item) => `
        <article class="check-card">
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </article>`,
          )
          .join('')}
      </div>
      <p class="footer-note">
        اگر بخواهید، قدم بعدی می‌تواند اضافه کردن «درباره ما»، «قوانین و مقررات» و
        «حریم خصوصی» به همین سایت باشد تا آماده‌ی بررسی اینماد شوید.
      </p>
    </section>
  </main>
</body>
</html>`;
}
