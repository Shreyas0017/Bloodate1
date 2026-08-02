/**
 * Wraps an async Express route handler and forwards any unhandled promise
 * rejections to Express's next() error handler, preventing unhandled rejections
 * from crashing the server.
 *
 * Usage:
 *   router.get('/', asyncHandler(async (req, res) => { ... }))
 */
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
