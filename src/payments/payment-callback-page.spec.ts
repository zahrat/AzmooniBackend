import { PaymentStatus } from '../../generated/prisma/enums';
import { renderPaymentCallbackPage } from './payment-callback-page';

describe('renderPaymentCallbackPage', () => {
  it('renders a responsive success page with an app deep link', () => {
    const page = renderPaymentCallbackPage({
      amountToman: 25_000,
      appReturnUrl: 'azmooni://payment',
      bookId: 4,
      paymentId: 22,
      refId: '987654',
      status: PaymentStatus.PAID,
    });

    expect(page).toContain('<meta name="viewport"');
    expect(page).toContain('پرداخت موفق بود');
    expect(page).toContain('۲۵٬۰۰۰ تومان');
    expect(page).toContain('کد پیگیری');
    expect(page).toContain(
      'azmooni://payment?paymentId=22&amp;bookId=4&amp;status=PAID&amp;refId=987654',
    );
  });

  it('escapes the reference id before rendering it', () => {
    const page = renderPaymentCallbackPage({
      amountToman: 10_000,
      appReturnUrl: 'azmooni://payment',
      bookId: 3,
      paymentId: 21,
      refId: '<script>alert(1)</script>',
      status: PaymentStatus.PAID,
    });

    expect(page).not.toContain('<script>alert(1)</script>');
    expect(page).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
