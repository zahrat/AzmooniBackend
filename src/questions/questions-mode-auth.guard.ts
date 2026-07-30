import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuestionMode } from './question-mode';

@Injectable()
export class QuestionsModeAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      query: { mode?: string };
      headers: { authorization?: string };
    }>();

    const requiresAuthentication = [
      QuestionMode.Wrong,
      QuestionMode.Favorite,
    ].includes(request.query.mode as QuestionMode);
    const hasAuthorizationHeader = Boolean(request.headers.authorization);

    if (!requiresAuthentication && !hasAuthorizationHeader) {
      return true;
    }

    return super.canActivate(context);
  }
}
