import { ExecutionContext } from '@nestjs/common';
import { QuestionsModeAuthGuard } from './questions-mode-auth.guard';

describe('QuestionsModeAuthGuard', () => {
  const context = (mode?: string, authorization?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          query: { mode },
          headers: { authorization },
        }),
      }),
    }) as ExecutionContext;

  let guard: QuestionsModeAuthGuard;
  let parentCanActivate: jest.SpyInstance;

  beforeEach(() => {
    guard = new QuestionsModeAuthGuard();
    const parentPrototype = Object.getPrototypeOf(
      QuestionsModeAuthGuard.prototype,
    ) as { canActivate: (context: ExecutionContext) => boolean };
    parentCanActivate = jest
      .spyOn(parentPrototype, 'canActivate')
      .mockReturnValue(true);
  });

  afterEach(() => {
    parentCanActivate.mockRestore();
  });

  it('allows all mode without authentication', () => {
    expect(guard.canActivate(context('all'))).toBe(true);
    expect(parentCanActivate).not.toHaveBeenCalled();
  });

  it.each(['wrong', 'favorite'])(
    'requires authentication for %s mode',
    (mode) => {
      const executionContext = context(mode);

      expect(guard.canActivate(executionContext)).toBe(true);
      expect(parentCanActivate).toHaveBeenCalledWith(executionContext);
    },
  );
});
