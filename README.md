<div align="center">
  <img src="/public/img/skeleton.png" alt="skeleton">
</div>

# remote-rush (Koa 2.x)

[![Dependency Status](https://david-dm.org/danneu/koa-skeleton.svg)](https://david-dm.org/danneu/koa-skeleton)

Remote Rush directory and job board

## The Stack

Depends on Node v7.x:

- **Micro-framework**: [Koa 2.x](http://koajs.com/). It's very similar to [Express](http://expressjs.com/) except it supports async/await.
- **Database**: [Postgres](http://www.postgresql.org/).
- **User-input validation**: [koa-bouncer](https://github.com/danneu/koa-bouncer).
- **View-layer templating**: [Nunjucks](https://mozilla.github.io/nunjucks/). Very similar to Django's [Jinja2](http://jinja.pocoo.org/) templates. The successor to [Swig](http://paularmstrong.github.io/swig/). Compatible with "Django HTML" editor syntax highlighter plugins like `htmldjango` in Vim.
- **Deployment**: [Heroku](https://heroku.com/). Keeps things easy while you focus on coding your webapp. Forces you to write your webapp statelessly and horizontally-scalably.

## What about Koa 1.x?

koa-skeleton now works with Koa 2.x, but it used to be built with Koa 1.x.

Here's the most recent code that supported Koa 1.x: <https://github.com/danneu/koa-skeleton/tree/551470a9f5422b0a266a048397edfe9900be4703>

## Setup

Using vagrant:

`vagrant up`
`vagrant ssh`
`npm install`
`npm run reset-db`
`npm run start-dev`

Or manually on your machine:

You must have Postgres installed. I recommend http://postgresapp.com/ for OSX.

    createdb koa-skeleton
    git clone git@github.com:danneu/koa-skeleton.git
    cd koa-skeleton
    touch .env
    npm install
    npm run reset-db
    npm run start-dev

    > Server is listening on http://localhost:3000...

Create a `.env` file in the root directory which will let you set environment variables. `npm run start-dev` will read from it.

Example `.env`:

    DATABASE_URL=postgres://username:password@localhost:5432/my-database
    DEBUG=app:*

## Configuration (Environment Variables)

remote-rush is configured with environment variables.

You can set these by putting them in a `.env` file at the project root (good
for development) or by exporting them in the environment (good for production,
like on Heroku).

You can look at `src/config.js` to view these and their defaults.

| Evironment Variable | Type | Default | Description |
| --- | --- | --- | --- |
| <code>NODE_ENV</code> | String | "development" | Set to `"production"` on the production server to enable some optimizations and security checks that are turned off in development for convenience. |
| <code>PORT</code> | Integer | 3000 | Overriden by Heroku in production. |
| <code>DATABASE_URL</code> | String | "postgres://localhost:5432/koa-skeleton" | Overriden by Heroku in production if you use its Heroku Postgres addon. |
| <code>TRUST_PROXY</code> | Boolean | false | Set it to the string `"true"` to turn it on. Turn it on if you're behind a proxy like Cloudflare which means you can trust the IP address supplied in the `X-Forwarded-For` header. If so, then `ctx.request.ip` will use that header if it's set. |
| <code>HOSTNAME</code> | String | undefined | Set it to your hostname in production to enable basic CSRF protection. i.e. `example.com`, `subdomain.example.com`. If set, then any requests not one of `GET | HEAD | OPTIONS` must have a `Referer` header set that originates from the given HOSTNAME. The referer is always set for `<form>` submissions, for example. Very crude protection. |

Don't access `process.env.*` directly in the app.
Instead, require the `src/config.js` and access them there.

## Philosophy/Opinions

- It's better to write explicit glue code between small libraries than credentializing in larger libraries/frameworks that try to do everything for you. When you return to a project in eight months, it's generally easier to catch up by reading explicit glue code then library idiosyncrasies. Similarly, it's easier to catch up by reading SQL strings than your clever ORM backflips.
- Just write SQL. When you need more complex/composable queries (like a /search endpoint with various filter options), consider using a SQL query building library like [knex.js](http://knexjs.org/).
- Use whichever Javascript features that are supported by the lastest stable version of Node. I don't think Babel compilation and the resulting idiosyncrasies are worth the build step.

## Conventions

- Aside from validation, never access query/body/url params via the Koa default like `ctx.request.body.username`. Instead, use koa-bouncer to move these to the `ctx.vals` object and access them there. This forces you to self-document what params you expect at the top of your route and prevents the case where you forget to validate params.

    ``` javascript
    router.post('/users', async (ctx, next) => {

      // Validation

      ctx.validateBody('uname')
        .isString('Username required')
        .trim()
        .isLength(3, 15, 'Username must be 3-15 chars')
      ctx.validateBody('email')
        .optional()
        .isString()
        .trim()
        .isEmail()
      ctx.validateBody('password1')
        .isString('Password required')
        .isLength(6, 100, 'Password must be 6-100 chars')
      ctx.validateBody('password2')
        .isString('Password confirmation required')
        .eq(ctx.vals.password1, 'Passwords must match')

      // Validation passed. Access the above params via `ctx.vals` for
      // the remainder of the route to ensure you're getting the validated
      // version.

      const user = await db.insertUser(
        ctx.vals.uname, ctx.vals.password1, ctx.vals.email
      )

      ctx.redirect(`/users/${user.uname}`)
    })
    ```
## License

MIT
