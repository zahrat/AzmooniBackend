import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { PaginationQueryDTO } from './pagination-query.dto';

describe('PaginationQueryDTO', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  const metadata: ArgumentMetadata = {
    type: 'query',
    metatype: PaginationQueryDTO,
    data: undefined,
  };

  it('uses the default page and limit', async () => {
    await expect(pipe.transform({}, metadata)).resolves.toEqual({
      page: 1,
      limit: 20,
    });
  });

  it('transforms valid query strings to numbers', async () => {
    await expect(
      pipe.transform({ page: '2', limit: '50' }, metadata),
    ).resolves.toEqual({
      page: 2,
      limit: 50,
    });
  });

  it.each([
    { page: '0', limit: '20' },
    { page: '1.5', limit: '20' },
    { page: '1', limit: '0' },
    { page: '1', limit: '101' },
  ])('rejects invalid pagination values: %o', async (query) => {
    await expect(pipe.transform(query, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
