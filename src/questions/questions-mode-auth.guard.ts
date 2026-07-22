import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuestionMode } from './question-mode';

@Injectable()
export class QuestionsModeAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      query: { mode?: string };
    }>();

    if (request.query.mode !== QuestionMode.Wrong) {
      return true;
    }

    return super.canActivate(context);
  }
}
