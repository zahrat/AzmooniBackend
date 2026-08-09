import { Injectable } from '@nestjs/common';

type PageSection = {
  description?: string;
  items?: Array<{ title: string; description: string }>;
  footer?: string;
  title: string;
};

@Injectable()
export class AppService {
  getEcommerceTrustPage(): string {
    return this.getHomePage();
  }

  getHomePage(): string {
    return renderPage({
      badge: 'فروش کتاب و سوالات آزمونی',
      description:
        'آزمونی یک سرویس آموزشی برای خرید کتاب، مرور فصل‌ها، حل سوالات و مدیریت پرداخت‌های کاربران است. این صفحه برای آماده‌سازی همین سایت جهت دریافت اینماد نوشته شده است.',
      heroTitle: 'سایت آموزشی و فروشگاهی شما باید هویت، محتوا و فرایند خرید روشن داشته باشد',
      primaryAction: { href: '#checklist', label: 'دیدن الزامات' },
      secondaryAction: {
        href: '/about',
        label: 'درباره ما',
      },
      sidebarTitle: 'چیزهایی که همین سایت دارد',
      sidebarItems: [
        'فروش کتاب‌ها و محتوای آموزشی',
        'نمایش فصل‌ها و سوالات هر کتاب',
        'احراز هویت کاربر با موبایل و رمز یکبارمصرف',
        'پرداخت و فعال‌سازی دسترسی به کتاب',
      ],
      sections: [
        {
          title: 'الزامات اینماد برای این سایت',
          description:
            'اگر این موارد روی سایت مشخص و درست باشند، بررسی اینماد برای یک فروشگاه محتوای آموزشی خیلی راحت‌تر می‌شود.',
          items: [
            {
              title: 'هویت و اطلاعات تماس واقعی',
              description:
                'نام صاحب کسب‌وکار یا شرکت، آدرس، تلفن ثابت، موبایل و ایمیل پشتیبانی باید واقعی و یکدست باشند.',
            },
            {
              title: 'صفحات حقوقی کامل',
              description:
                'صفحات «درباره ما»، «قوانین و مقررات» و «حریم خصوصی» باید دقیقاً با مدل فروش کتاب و سوالات این سایت هماهنگ باشند.',
            },
            {
              title: 'فرایند خرید و پرداخت شفاف',
              description:
                'کاربر باید قبل از پرداخت بداند چه کتابی می‌خرد، قیمت چیست، دسترسی بعد از پرداخت چگونه فعال می‌شود و وضعیت سفارش کجا دیده می‌شود.',
            },
            {
              title: 'دامنه و مالکیت مشخص',
              description:
                'دامنه بهتر است به نام مالک یا شرکت ثبت‌شده باشد و نام برند، دامنه و اطلاعات تماس همدیگر را تأیید کنند.',
            },
            {
              title: 'امنیت و HTTPS',
              description:
                'سایت باید با HTTPS اجرا شود، فرم‌های ورود و پرداخت سالم باشند و هیچ بخش حساسی بدون امنیت منتقل نشود.',
            },
          ],
          footer:
            'اگر بخواهید، همین متن را می‌توانیم یک پله رسمی‌تر کنیم تا مستقیم داخل سایتتان استفاده شود.',
        },
      ],
    });
  }

  getAboutPage(): string {
    return renderPage({
      badge: 'درباره ما',
      description:
        'آزمونی یک سامانه آموزشی برای مرور کتاب‌ها، سوالات، پاسخ‌ها و خرید محتوای آموزشی است. کاربران بعد از ورود، می‌توانند کتاب‌ها را ببینند، سوالات را مرور کنند و در صورت نیاز خرید انجام دهند.',
      heroTitle: 'آزمونی یک سامانه آموزشی برای کتاب‌ها و سوالات آزمونی است',
      primaryAction: { href: '/', label: 'بازگشت به صفحه اصلی' },
      secondaryAction: { href: '/terms', label: 'قوانین و مقررات' },
      sidebarTitle: 'در این صفحه چه بگویید',
      sidebarItems: [
        'تمرکز روی کتاب‌ها، فصل‌ها و سوالات آموزشی',
        'نحوه ثبت‌نام و ورود با موبایل',
        'خرید و فعال‌سازی دسترسی به کتاب‌ها',
        'پشتیبانی و راه ارتباطی با تیم',
      ],
      sections: [
        {
          title: 'متن پیشنهادی برای درباره ما',
          description:
            'این صفحه باید روشن کند که سایت دقیقا چه کاری انجام می‌دهد و کاربر بعد از ورود چه انتظاری داشته باشد.',
          items: [
            {
              title: 'هویت روشن',
              description:
                'نام برند، نوع فعالیت و مخاطب هدف را صریح بنویسید.',
            },
            {
              title: 'محصول و خدمت اصلی',
              description:
                'بگویید سایت برای خرید کتاب، دسترسی به فصل‌ها و مرور سوالات طراحی شده است.',
            },
            {
              title: 'نحوه استفاده',
              description:
                'توضیح دهید کاربر با ثبت‌نام، ورود و پرداخت چگونه به محتوای خریداری‌شده دسترسی می‌گیرد.',
            },
            {
              title: 'پشتیبانی',
              description:
                'راه‌های تماس و پشتیبانی را با اطلاعات صفحه تماس یکسان نگه دارید.',
            },
          ],
          footer:
            'اگر بخواهی، این صفحه را می‌شود به متن رسمی‌تر و آماده انتشار در سایت هم تبدیل کرد.',
        },
      ],
    });
  }

  getTermsPage(): string {
    return renderPage({
      badge: 'قوانین و مقررات',
      description:
        'این صفحه باید شرایط خرید کتاب، دسترسی به سوالات، بازگشت وجه، و مسئولیت کاربر و سایت را شفاف توضیح دهد.',
      heroTitle: 'قوانین و مقررات این سایت باید برای خرید محتوای آموزشی دقیق باشد',
      primaryAction: { href: '/', label: 'بازگشت به صفحه اصلی' },
      secondaryAction: { href: '/privacy', label: 'حریم خصوصی' },
      sidebarTitle: 'بندهای مهم این سایت',
      sidebarItems: [
        'ثبت سفارش و فعال شدن دسترسی',
        'پرداخت و صدور رسید',
        'قوانین استفاده از کتاب‌ها و سوالات',
        'شرایط لغو و بازپرداخت',
      ],
      sections: [
        {
          title: 'محتوای پیشنهادی قوانین و مقررات',
          description:
            'برای سایت آموزشی بهتر است شرایط استفاده واضح باشد و به کاربر بگوید بعد از پرداخت چه چیزی دریافت می‌کند.',
          items: [
            {
              title: 'ثبت سفارش',
              description:
                'مشخص کنید سفارش چه زمانی نهایی می‌شود و دسترسی چه زمانی فعال می‌شود.',
            },
            {
              title: 'پرداخت و قیمت',
              description:
                'قیمت کتاب‌ها، هزینه‌های احتمالی و وضعیت مالیات یا کارمزد را شفاف بنویسید.',
            },
            {
              title: 'تحویل محتوا',
              description:
                'اگر تحویل دیجیتال است، توضیح دهید دسترسی از چه مسیر و در چه بازه‌ای فعال می‌شود.',
            },
            {
              title: 'لغو و بازپرداخت',
              description:
                'شرایط لغو، برگشت وجه و محدودیت‌های آن را صریح و قابل اجرا بنویسید.',
            },
          ],
          footer:
            'برای محتوای آموزشی، شفافیت درباره دسترسی به کتاب و سوالات از همه چیز مهم‌تر است.',
        },
      ],
    });
  }

  getPrivacyPage(): string {
    return renderPage({
      badge: 'حریم خصوصی',
      description:
        'این سایت برای ورود، خرید و پشتیبانی اطلاعاتی مثل شماره موبایل، نام، داده‌های پرداخت و سوابق دسترسی را پردازش می‌کند. این صفحه باید این رفتار را روشن کند.',
      heroTitle: 'حریم خصوصی باید دقیق بگوید چه داده‌ای را چرا نگه می‌دارید',
      primaryAction: { href: '/', label: 'بازگشت به صفحه اصلی' },
      secondaryAction: { href: '/about', label: 'درباره ما' },
      sidebarTitle: 'داده‌هایی که این سایت پردازش می‌کند',
      sidebarItems: [
        'شماره موبایل برای ورود و پشتیبانی',
        'نام و اطلاعات پروفایل کاربر',
        'سوابق خرید و پرداخت',
        'اطلاعات مرور و کوکی‌ها',
      ],
      sections: [
        {
          title: 'محورهای اصلی حریم خصوصی',
          description:
            'متن این صفحه باید با رفتار واقعی سایت هم‌خوان باشد و چیزی را که واقعاً جمع می‌کنید، دقیق توضیح دهد.',
          items: [
            {
              title: 'نوع داده‌ها',
              description:
                'نوع داده‌هایی را که از کاربر می‌گیرید دقیق بنویسید.',
            },
            {
              title: 'استفاده از داده‌ها',
              description:
                'توضیح دهید داده‌ها برای ورود، فعال‌سازی خرید، پشتیبانی و بهبود خدمات استفاده می‌شوند.',
            },
            {
              title: 'نگهداری و امنیت',
              description:
                'بگویید داده‌ها چگونه نگهداری می‌شوند و چه تدابیر امنیتی برای آن‌ها دارید.',
            },
            {
              title: 'اشتراک‌گذاری',
              description:
                'اگر اطلاعات با درگاه پرداخت، سرویس پیامک یا ابزار تحلیلی به اشتراک می‌رود، آن را شفاف اعلام کنید.',
            },
          ],
          footer:
            'اگر خواستی، قدم بعدی می‌تواند نوشتن متن رسمی‌تر و نهایی برای انتشار روی سایت باشد.',
        },
      ],
    });
  }
}

type RenderPageInput = {
  badge: string;
  description: string;
  heroTitle: string;
  primaryAction: { href: string; label: string };
  sections: PageSection[];
  secondaryAction: { href: string; label: string };
  sidebarItems: string[];
  sidebarTitle: string;
};

function renderPage(input: RenderPageInput): string {
  const navigation = [
    { href: '/', label: 'صفحه اصلی' },
    { href: '/about', label: 'درباره ما' },
    { href: '/terms', label: 'قوانین و مقررات' },
    { href: '/privacy', label: 'حریم خصوصی' },
  ];

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0f766e">
  <title>${escapeHtml(input.heroTitle)} | آزمونی</title>
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
      margin-bottom: 18px;
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
    .nav {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 0 0 26px;
    }
    .nav a {
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
      text-decoration: none;
      background: rgba(255, 255, 255, 0.8);
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
      background: linear-gradient(180deg, rgba(15, 118, 110, 0.1), rgba(255, 255, 255, 0.92)), white;
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
      <div class="badge">${escapeHtml(input.badge)}</div>
    </header>
    <nav class="nav" aria-label="صفحه‌ها">
      ${navigation
        .map(
          (item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`,
        )
        .join('')}
    </nav>
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-grid">
        <div>
          <h1 id="hero-title">${escapeHtml(input.heroTitle)}</h1>
          <p class="lead">${escapeHtml(input.description)}</p>
          <div class="cta-row">
            <a class="button" href="${escapeHtml(input.primaryAction.href)}">${escapeHtml(input.primaryAction.label)}</a>
            <a class="button-secondary" href="${escapeHtml(input.secondaryAction.href)}">${escapeHtml(input.secondaryAction.label)}</a>
          </div>
        </div>
        <aside class="hero-panel" aria-label="${escapeHtml(input.sidebarTitle)}">
          <h2 class="panel-title">${escapeHtml(input.sidebarTitle)}</h2>
          <ul class="panel-list">
            ${input.sidebarItems
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join('')}
          </ul>
        </aside>
      </div>
    </section>
    ${input.sections
      .map(
        (section) => `
    <section class="section">
      <h2>${escapeHtml(section.title)}</h2>
      <p class="section-note">${escapeHtml(section.description ?? '')}</p>
      <div class="checks">
        ${(section.items ?? [])
          .map(
            (item) => `
        <article class="check-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </article>`,
          )
          .join('')}
      </div>
      ${section.footer ? `<p class="footer-note">${escapeHtml(section.footer)}</p>` : ''}
    </section>`,
      )
      .join('')}
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
