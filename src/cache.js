const IntervalCache = require('interval-cache')

const db = require('./db')

module.exports = new IntervalCache()
  .every('jobs-count', 1000 * 60, db.getJobsCount, 0)
  .every('users-count', 1000 * 60, db.getUsersCount, 0)
  .start()
