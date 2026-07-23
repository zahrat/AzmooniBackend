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

    const requiresAuthentication = request.query.mode === QuestionMode.Wrong;
    const hasAuthorizationHeader = Boolean(request.headers.authorization);

    if (!requiresAuthentication && !hasAuthorizationHeader) {
      return true;
    }

    return super.canActivate(context);
  }
}
