const debug = require('debug')('app:cancan')
const assert = require('better-assert')

exports.isAdmin = function(user) {
  if (!user) return false
  return user.role === 'ADMIN'
}

// Retuns boolean
//
// `user` is object (logged in) or undefined (guest)
// `action` is required string, e.g. 'APPROVE'
// `target` is optional value that the action applies to.
//
// Usage:
//
//    can(this.currUser, 'APPROVE, job)
//    can(this.currUser, 'APPROVE')
exports.can = function(user, action, target) {
  assert(typeof action === 'string')

  switch (action) {
    case 'APPROVE': // target is other user
      assert(target)
      // Guests never can
      if (!user) return false
      // Banned never can
      if (user.role === 'BANNED') return false
      // Admins always can
      if (user.role === 'ADMIN') return true
      // Mods can only see non-admins
      if (user.role === 'MOD') return target.role !== 'ADMIN'
      // Members can only update their own settings
      if (user.role === 'MEMBER') return target.id === user.id
      return false
    default:
      debug('Unsupported cancan action: %j', action)
      return false
  }
}
