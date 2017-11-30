const { extend } = require('pg-extra')
const pg = extend(require('pg'))

const config = require('../config')

const c = {
    host: process.env.PGHOST ? process.env.PGHOST : 'localhost',
    user: process.env.PGUSER ? process.env.PGUSER : 'vagrant_root',
    database: process.env.PGDB ? process.env.PGDB : 'vagrant',
    password: process.env.PGPASS ? process.env.PGPASS : 'vagrant',
    port: 5432,
    max: 50,
    idleTimeoutMillis: 30000
};

const pool = new pg.Pool(c)

module.exports = { pool }
