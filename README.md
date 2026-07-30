<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## API

The server listens on `http://localhost:3000` by default. Protected endpoints
expect an access token in the `Authorization: Bearer <token>` header.

Access levels:

- Public: no access token is required.
- User: a valid access token is required.
- Admin: the authenticated user must have the `ADMIN` role.
- Conditional: availability depends on question mode and paid-content access.

### General

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Health-style greeting |

### Users

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/users/signup` | Public | Create a user |
| `POST` | `/users/signin` | Public | Sign in and receive access and refresh tokens |
| `POST` | `/users/refresh` | Public | Exchange a refresh token for new tokens |
| `GET` | `/users/me` | User | Get the authenticated user |

### Books

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/books` | Public | List books and their chapters |
| `GET` | `/books/wrong` | User | List books containing the user's wrong answers |
| `GET` | `/books/favorites` | User | List books containing the user's favorite questions |
| `GET` | `/books/:id` | Public | Get one book and its chapters |
| `POST` | `/books/add` | Admin | Create a book |

### Chapters

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/chapters` | Admin | Create a chapter |
| `GET` | `/chapters/book/:bookId` | User | List the chapters in a book |

### Questions

The book and chapter question-list endpoints accept `page` (default `1`),
`limit` (default `20`, maximum `100`), and `mode` (`all`, `wrong`, or
`favorite`, default `all`) query parameters. The `wrong` and `favorite` modes
require authentication. Supplying an access token in `all` mode includes
user-specific state. Paid books require a purchase when accessed through the
book endpoint; chapter and individual question endpoints remain public when
their chapter is marked as free.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/questions` | Admin | Create a question using `multipart/form-data`; optional image field: `image` |
| `GET` | `/questions/book/:bookId` | Conditional | List questions in a book |
| `GET` | `/questions/chapter/:chapterId` | Conditional | List questions in a chapter |
| `GET` | `/questions/:id` | Conditional | Get one question |
| `POST` | `/questions/:id/favorite` | User | Add a question to favorites |
| `POST` | `/questions/:id/unfavorite` | User | Remove a question from favorites |
| `GET` | `/questions/favorites/:bookId` | User | List favorite questions in a book; accepts `page` and `limit` |

### Answers

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/answers` | User | Submit or update an answer |
| `GET` | `/answers/book/:bookId` | User | List the user's answers for a book |
| `GET` | `/answers/wrong/book/:bookId` | User | List the user's wrong answers for a book |

### Payments

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/payments/books/:bookId/request` | User | Start or resume a book purchase |
| `GET` | `/payments/zarinpal/callback` | Public | Handle Zarinpal's `Authority` and `Status` callback |
| `POST` | `/payments/:id/verify` | User | Retry payment verification |
| `GET` | `/payments/:id` | User | Get an owned payment |

## Project setup

```bash
$ npm install
```

## Bootstrap an administrator

Set the administrator credentials in your local `.env` file. Do not commit
that file:

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-strong-password
ADMIN_NAME=Admin
```

Apply the migrations and run the seed:

```bash
$ npm run deploy:migrate
$ npm run seed
```

The seed stores the administrator in the `User` table with the `ADMIN` role.
The password is stored only as a bcrypt hash. If the email already belongs to
a user, the seed promotes that existing account and preserves its password.

## Import books, chapters, and questions from Excel

Use the standard workbook template and keep the column names unchanged. The
`ورود اطلاعات` sheet is imported; each non-empty row represents one question.

The default command is a dry run. It validates the workbook and referenced
images without writing to the database:

```bash
$ npm run import:data -- /path/to/questions.xlsx
```

If the `imageFile` column is used, place the images in one directory and pass
that directory explicitly:

```bash
$ npm run import:data -- /path/to/questions.xlsx \
    --images-dir /path/to/question-images
```

After the dry run succeeds, apply the same file to staging. The database name
must exactly match the database in `DATABASE_URL`:

```bash
$ npm run import:data -- /path/to/questions.xlsx \
    --images-dir /path/to/question-images \
    --apply \
    --confirm-database app_staging
```

Back up production before importing there, then use its exact database name:

```bash
$ npm run import:data -- /path/to/questions.xlsx \
    --images-dir /path/to/question-images \
    --apply \
    --confirm-database nestapp
```

Books are matched by title, chapters by book and chapter order, and questions
by exact text within a chapter. Re-importing the same workbook updates changed
fields instead of duplicating records. New question order values are allocated
atomically. Imported images are validated and stored under content-hashed file
names, so importing the same image again does not create another copy.

## Zarinpal payments

The development environment uses Zarinpal Sandbox and does not require a
Zarinpal account:

```bash
ZARINPAL_SANDBOX=true
ZARINPAL_MERCHANT_ID=00000000-0000-0000-0000-000000000000
ZARINPAL_CALLBACK_URL=http://localhost:3000/payments/zarinpal/callback
```

The seed configures `Clean Code` as a paid demo book priced at 10,000 toman.
An authenticated user starts a purchase with:

```text
POST /payments/books/:bookId/request
```

The response contains `paymentUrl`. Open that URL in a browser to complete the
Sandbox flow. Zarinpal redirects the browser to:

```text
GET /payments/zarinpal/callback?Authority=...&Status=OK
```

The callback verifies the transaction with Zarinpal before granting access.
Repeated purchase requests reuse the same active payment for 30 minutes instead
of creating multiple gateway transactions. Payment status can be retrieved by
its owner:

```text
GET /payments/:id
```

If callback verification is interrupted by a temporary network failure, the
payment remains retryable:

```text
POST /payments/:id/verify
```

Callback handling and book-access creation are idempotent, so duplicate
callbacks do not create duplicate purchases.

For production, set `ZARINPAL_SANDBOX=false`, use the merchant ID issued by
Zarinpal, and provide a public HTTPS callback URL.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
