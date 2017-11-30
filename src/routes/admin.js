const Router = require('koa-router')
const debug = require('debug')('app:routes:admin')
const AWS = require('aws-sdk')
const request = require('request')
const fs = require('fs-promise');
const gm = require('gm').subClass({ imageMagick: true });

const db = require('../db')
const staticVars = require('../static')
// Every route in this router is only accessible to admins

const router = new Router()

AWS.config.update({
    accessKeyId: process.env.SPACES_ACCESS_KEY_ID,
    secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY
});
const spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com');
const s3 = new AWS.S3({endpoint: spacesEndpoint});

// //////////////////////////////////////////////////////////
// Routes

// Show admin panel homepage
router.get('/admin', async ctx => {
  const jobs = await db.getJobs(0)
  await ctx.render('admin/index', {
    ctx,
    jobs,
  })
})

router.get('/job/approve/:id', async ctx => {
    ctx.validateParam('id')
    await db.approveJobById(ctx.vals.id)
    ctx.redirect('/admin')
})

router.post('/admin/companies/:id', async ctx => {
    ctx.validateParam('id')

    let url = ctx.request.body.logo;
    const data = {
        Bucket: 'remote-rush',
        Key: `companies/logos/${process.env.NODE_ENV}/${ctx.request.body.name.replace(/\s/g, '')}.png`,
        ACL: 'public-read'
    };

    if (url.indexOf('remote-rush') < 0 && url) {
        await request(ctx.request.body.logo, {encoding: 'binary'}, async (error, response, body) => {
            await fs.writeFile('/tmp/tmp.png', body, 'binary');
            await gm('/tmp/tmp.png').resize(150).write('/tmp/tmp.png', function (err) {
              console.log(err);
            });

            data.Body = fs.createReadStream('/tmp/tmp.png');

            await s3.putObject(data, (err, res) => {
                console.log(err, res)
            });
        });
        url = `https://remote-rush.nyc3.digitaloceanspaces.com/${data.Key}`;
    }

  await (async () => {
    // Insert
    await db.updateCompany(ctx.vals.id, {
      logo: url || '',
      name: ctx.request.body.name,
      url: ctx.request.body.url,
      description: ctx.request.body.description,
      year_founded: ctx.request.body.year_founded,
      revenue: ctx.request.body.revenue,
      employees: ctx.request.body.employees,
      avg_salaries: JSON.stringify({
        engineering: ctx.request.body.avg_engineering,
        marketing: ctx.request.body.avg_marketing,
        sales: ctx.request.body.avg_sales,
        business: ctx.request.body.avg_business,
        misc: ctx.request.body.avg_misc
      }),
      tags: ctx.request.body.tags
    })
  })()

  await ctx.redirect(`/companies`)
})

router.get('/admin/companies/:id', async ctx => {
    ctx.validateParam('id')
    const company = await db.getCompanyById(ctx.vals.id)
    ctx.assert(company, 404)
    await ctx.render('company_show', {
        ctx,
        company,
        revenue: staticVars.revenue,
        employees: staticVars.employees
    })
})

// //////////////////////////////////////////////////////////

module.exports = router
