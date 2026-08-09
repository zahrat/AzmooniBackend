import { KavenegarSmsSender } from './sms-sender';

describe('KavenegarSmsSender', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.KAVENEGAR_API_KEY;
  const originalTemplate = process.env.KAVENEGAR_OTP_TEMPLATE;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    process.env.KAVENEGAR_API_KEY = 'test-api-key';
    process.env.KAVENEGAR_OTP_TEMPLATE = 'azmooni-login';
  });

  afterEach(() => {
    process.env.KAVENEGAR_API_KEY = originalApiKey;
    process.env.KAVENEGAR_OTP_TEMPLATE = originalTemplate;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('sends the OTP through the verification lookup endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        return: { status: 200, message: 'تایید شد' },
        entries: [{ messageid: 123 }],
      }),
    });

    await expect(
      new KavenegarSmsSender().sendOtp('+989121234567', '123456'),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.kavenegar.com/v1/test-api-key/verify/lookup.json',
      expect.objectContaining({
        method: 'POST',
        body: new URLSearchParams({
          receptor: '09121234567',
          token: '123456',
          template: 'azmooni-login',
          type: 'sms',
        }),
      }),
    );
  });

  it('rejects an unsuccessful Kavenegar response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        return: { status: 424, message: 'template not found' },
      }),
    });

    await expect(
      new KavenegarSmsSender().sendOtp('+989121234567', '123456'),
    ).rejects.toThrow('template not found');
  });

  it('requires both the API key and approved template', async () => {
    delete process.env.KAVENEGAR_OTP_TEMPLATE;

    await expect(
      new KavenegarSmsSender().sendOtp('+989121234567', '123456'),
    ).rejects.toThrow('KAVENEGAR_API_KEY and KAVENEGAR_OTP_TEMPLATE');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
