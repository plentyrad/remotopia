const assert = require('better-assert')
const router = require('koa-router')()
const debug = require('debug')('app:routes:index')
const sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const markdown = require( "markdown" ).markdown;

const db = require('../db')
const pre = require('../presenters')
const mw = require('../middleware')
const config = require('../config')
const belt = require('../belt')
const paginate = require('../paginate')
const cache = require('../cache')
const staticVars = require('../static')
// //////////////////////////////////////////////////////////

// Useful route for quickly testing something in development
// 404s in production
router.get('/test', async ctx => {
  ctx.assert(config.NODE_ENV === 'development', 404)
})

router.get('/', async ctx => {
  ctx.redirect('/jobs')
})

router.get('/jobs', async ctx => {
  const jobs = await db.getJobs(ctx.query)
  console.log(jobs)
  let res = {
    all: [],
    engineering: [],
    design: [],
    marketing: [],
    sales: [],
    business: [],
    other: []
  };

  jobs.forEach((job) => {
      res[job.type].push(job);
      res.all.push(job);
  });

  await ctx.render('homepage', {
    ctx,
    jobs: res,
    staticVars,
    jobActive: true,
    query: ctx.query
  })
})

router.get('/companies', async ctx => {
    const companies = await db.getCompanies(ctx.query)
    await ctx.render('companies', {
        ctx,
        companies,
        revenue: staticVars.revenue,
        employees: staticVars.employees,
        employeeIndex: ctx.query.employees,
        revenueIndex: ctx.query.revenue,
        companyActive: true
    })
})

router.get('/job/:job_id', async ctx => {
    ctx.validateParam('job_id')
    const job = await db.getJobById(ctx.vals.job_id)
    ctx.assert(job, 404)
    job.description = markdown.toHTML(job.description) // @todo move to presenter
    await ctx.render('job_show', {
        ctx,
        job
    })
})

router.get('/post', async ctx => {
    const companies = await db.getAllCompanies()
    companies.forEach(pre.presentCompanies)
    await ctx.render('job_post', {
      companies,
      stripe_key: process.env.STRIPE_PUBLIC_KEY
    })
})

router.post('/subscribe', async ctx => {
    const request = sg.emptyRequest({
        method: 'POST',
        path: '/v3/contactdb/recipients',
        body: [{
            email: ctx.request.body.email,
            property: "remote-rush"
        }]
    });

    sg.API(request)
        .then(function (response) {
            ctx.body = response.body;
        })
        .catch(function (error) {
            ctx.body = error.response.body.errors;
        });

    ctx.status = 200;
})

router.post('/post', async ctx => {
    let companyId = 0;

    if (!parseInt(ctx.request.body.company_id)) {
        companyId = await db.insertCompany({
            name: ctx.request.body.name,
            url: ctx.request.body.url
        })
    }

    // Insert
    const job = await db.insertJob({
        company_id: companyId.id ? companyId.id : ctx.request.body.company_id,
        type: ctx.request.body.type,
        title: ctx.request.body.title,
        term: ctx.request.body.term,
        description: ctx.request.body.description,
        contact_email: ctx.request.body.contact_email,
        approved: 0
    })

    const token = ctx.request.body.stripeToken;

    const charge = await stripe['charges'].create({
      amount: 99.00,
      currency: "usd",
      description: "Remote Rush job posting",
      source: token,
    });

    if (charge['paid'] === true) {
      await db.approveJobById(job.id)
      ctx.flash = { message: ['success', 'Enjoy your new employee!'] }
    } else {
        ctx.flash = { message: ['error', 'Error processing your payment. Contact us at support@remoterush.com.'] }
    }

    ctx.redirect(`/jobs`)
})

// //////////////////////////////////////////////////////////

module.exports = router
