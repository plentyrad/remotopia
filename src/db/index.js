const assert = require('better-assert')
const uuid = require('uuid')
const knex = require('knex')({ client: 'pg' })
const { sql, _raw } = require('pg-extra')
const debug = require('debug')('app:db:index')

const belt = require('../belt')
const config = require('../config')
const { pool } = require('./util')


exports.admin = require('./admin')
exports.ratelimits = require('./ratelimits')


// UUID -> User | undefined
//
// Also bumps user's last_online_at column to NOW().
exports.getUserBySessionId = async function(sessionId) {
  assert(belt.isValidUuid(sessionId))
  return pool.one(sql`
    UPDATE users
    SET last_online_at = NOW()
    WHERE id = (
      SELECT u.id
      FROM users u
      WHERE u.id = (
        SELECT s.user_id
        FROM active_sessions s
        WHERE s.id = ${sessionId}
      )
    )
    RETURNING *
  `)
}

// Case-insensitive uname lookup
exports.getUserByUname = async function(uname) {
  assert(typeof uname === 'string')
  return pool.one(sql`
    SELECT *
    FROM users
    WHERE lower(uname) = lower(${uname})
  `)
}

// //////////////////////////////////////////////////////////

exports.insertJob = async function(data) {
  assert(typeof data.title === 'string')
  assert(typeof data.description === 'string')
  return pool.one(sql`
    INSERT INTO jobs (company_id, title, type, term, description, contact_email)
    VALUES (
      ${data.company_id},
      ${data.title},
      ${data.type},
      ${data.term},
      ${data.description},
      ${data.contact_email})
    RETURNING *
  `)
}

exports.insertCompany = async function(data) {
    return pool.one(sql`
    INSERT INTO companies (name, url)
    VALUES (
      ${data.name},
      ${data.url})
    RETURNING id
  `)
}

// //////////////////////////////////////////////////////////

// Returns created user record
//
// email is optional
exports.insertUser = async function(uname, password, email) {
  assert(typeof uname === 'string')
  assert(typeof password === 'string')
  const digest = await belt.hashPassword(password)
  return pool.one(sql`
    INSERT INTO users (uname, email, digest)
    VALUES (${uname}, ${email}, ${digest})
    RETURNING *
  `)
}

// userAgent is optional string
exports.insertSession = async function(userId, ipAddress, userAgent, interval) {
  assert(Number.isInteger(userId))
  assert(typeof ipAddress === 'string')
  assert(typeof interval === 'string')
  return pool.one(sql`
    INSERT INTO sessions (id, user_id, ip_address, user_agent, expired_at)
    VALUES (
      ${uuid.v4()},
      ${userId},
      ${ipAddress}::inet,
      ${userAgent},
      NOW() + ${interval}::interval
    )
    RETURNING *
  `)
}

exports.logoutSession = async function(userId, sessionId) {
  assert(Number.isInteger(userId))
  assert(typeof sessionId === 'string')
  return pool.query(sql`
    UPDATE sessions
    SET logged_out_at = NOW()
    WHERE user_id = ${userId}
      AND id = ${sessionId}
  `)
}

exports.getJobById = async function(jobId) {
  assert(jobId)
  return pool.one(sql`
    SELECT
    j.*,
    to_json(c.*) AS "company"
    FROM jobs j
    LEFT OUTER JOIN companies c ON j.company_id = c.id
    WHERE j.id = ${jobId}
  `)
}

exports.getCompanyById = async function(companyId) {
    assert(companyId)
    return pool.one(sql`
    SELECT *
    FROM companies
    WHERE id = ${companyId}
  `)
}

exports.searchCompanies = async function(filters) {
  let query = {};

  const string = knex('companies')
    .where(query)
    .returning('*')
    .toString()


  return pool.one(_raw`${string}`)
}

exports.updateCompany = async function(companyId, fields) {
    fields.avg_salaries = fields.avg_salaries || '{}'
    fields.tags = JSON.stringify(fields.tags.split(',')) || '[]'
    fields.updated_at = new Date()
    const string = knex('companies')
        .where({ id: Number(companyId) })
        .update(fields)
        .returning('*')
        .toString()
    return pool.one(_raw`${string}`)
}

exports.updateJob = async function(companyId, fields) {
  const string = knex('jobs')
    .where({ id: Number(companyId) })
    .update(fields)
    .returning('*')
    .toString()
  return pool.one(_raw`${string}`)
}


exports.approveJobById = async function(jobId) {
    assert(jobId)
    return pool.one(sql`
    UPDATE jobs
    SET approved = 1
    WHERE id = ${jobId}
  `)
}

exports.getAllCompanies = async function() {
    return pool.many(sql`SELECT * FROM companies`)
}


// //////////////////////////////////////////////////////////

exports.updateUser = async function(userId, fields) {
  assert(Number.isInteger(userId))
  const WHITELIST = ['email', 'role']
  assert(Object.keys(fields).every(key => WHITELIST.indexOf(key) > -1))
  const string = knex('users')
    .where({ id: userId })
    .update(fields)
    .returning('*')
    .toString()
  return pool.one(_raw`${string}`)
}

// //////////////////////////////////////////////////////////

exports.getJobs = async function(query) {
  Object.keys(query).forEach(function (key) {
    const q = query[key];
    if (q === 'all') delete query[key];
  });
  if (query.revenue) query.revenue = parseInt(query.revenue)
  if (query.employees) query.employees = parseInt(query.employees)
  query.approved = 1;
  const string = knex('jobs')
    .select(knex.raw('jobs.*, to_json(companies.*) AS "company"'))
    .leftOuterJoin('companies', 'jobs.company_id', 'companies.id')
    .where(query)
    .orderBy('created_at', 'desc')
    .toString()
  return pool.many(_raw`${string}`)
}

exports.getCompanies = async function(query) {
  if (query.revenue) query.revenue = parseInt(query.revenue)
  if (query.employees) query.employees = parseInt(query.employees)
  const string = knex('companies')
    .where(query)
    .returning('*')
    .toString()
  return pool.many(_raw`${string}`)
}

// //////////////////////////////////////////////////////////

// Returns Int
exports.getJobsCount = async function() {
  const { count } = await pool.one(sql`
    SELECT COUNT(*) AS "count"
    FROM jobs
  `)
  return count
}

// //////////////////////////////////////////////////////////

// Returns Int
exports.getUsersCount = async function() {
  const { count } = await pool.one(sql`
    SELECT COUNT(*) AS "count"
    FROM users
  `)
  return count
}

// //////////////////////////////////////////////////////////

// TODO: user.messages_count counter cache
// TODO: idx for is_hidden
exports.getUsers = async function(page) {
  page = page || 1
  assert(Number.isInteger(page))
  const perPage = config.USERS_PER_PAGE
  const offset = (page - 1) * perPage
  const limit = perPage
  return pool.many(sql`
    SELECT
      u.*,
      (
        SELECT COUNT(*)
        FROM messages
        WHERE user_id = u.id AND is_hidden = false
      ) AS messages_count
    FROM users u
    ORDER BY u.id DESC
    OFFSET ${offset}
    LIMIT ${limit}
  `)
}

// //////////////////////////////////////////////////////////
