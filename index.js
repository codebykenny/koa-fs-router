const path = require('path')
const fs = require('fs')
const qs = require('querystring')
const paramPattern = /(?::|%)([^\/]+)/
const val = (v) => (typeof v === 'undefined' ? 0 : v)

/** Takes routes and decorates them with a 'match' method that will return { params, query } if a path matches */
function addMatch(route) {
    let routePath = route.path
    let paramNames = []
    let matched
    // find any paths prefixed with `:` or `%`, and treat them as capture groups
    while ((matched = routePath.match(paramPattern)) !== null) {
        routePath = routePath.replace(paramPattern, '([^?/]+)')
        paramNames.push(matched[1])
    }

    /** If a route ends with `index`, allow matching that route without matching the `index` part */
    if (path.basename(routePath) === 'index') {
        route.isIndex = true
        routePath = routePath.replace(/\/index$/, '/?([:%]?index)?')
    }

    /** Create a regex with our path */
    let pattern = new RegExp(`^${routePath}(\\?(.*)|$)`, 'i')
    route.pattern = pattern
    route.match = (url) => {
        let m = url.match(pattern)
        if (m) {
            let params = paramNames.reduce((o, p, idx) => {
                o[p] = m[idx + 1]
                return o
            }, {})
            let query = qs.parse(m[m.length - 1])
            return { params, query }
        }
    }
    return route
}

/** Recursively searches for all js files inside a directory tree, and returns their full paths */
function findRoutes(dir, fileExtensions) {
    let files = fs.readdirSync(dir)
    let resolve = (f) => path.join(dir, f)
    let routes = files.filter((f) => fileExtensions.indexOf(path.extname(f)) !== -1).map(resolve)
    let dirs = files.filter((f) => fs.statSync(path.join(dir, f)).isDirectory()).map(resolve)
    return routes.concat(...dirs.map((subdir) => findRoutes(subdir, fileExtensions)))
}

module.exports = function (routesDir, config) {
    const fileExtensions = config && config.ext && config.ext instanceof Array ? config.ext : ['.js', '.ts']

    const routes = findRoutes(routesDir, fileExtensions)
        /** if filter function is set, filter routes */
        .filter((config && config.filter) || (() => true))
        /**
         * Require route files, then add a 'path' property to them
         * the path is in the form of '/path/file', relative to routesDir
         */
        .map((routeFile) => {
            let route = require(routeFile)
            let extPattern = new RegExp(path.extname(routeFile) + '$')
            if (!route.path) {
                route.path = '/'
                route.path += path.relative(routesDir, routeFile).replace(extPattern, '')
                //Fix issue with windows paths
                route.path = route.path.replace(/\\/g, '/')
            }
            return route
        })
        /** add a match function */
        .map(addMatch)
        /** sort named files ahead of subfolder index files */
        .map((route) => {
            if (!route.priority && route.isIndex) route.priority = -1
            return route
        })
        /** If a route exposes a `priority` property, sort the route on it. */
        .sort((a, b) => (val(a.priority) < val(b.priority) ? 1 : -1))

    /** generated match method - call with a req object to get a route. */
    return async function match(ctx, next) {
        let req = ctx.req

        let routeFn = (r) => r[req.method] || (typeof r === 'function' && r) || (typeof r.default === 'function' && r.default)

        let found = routes.find((r) => {
            let matched = r.match(req.url)
            let hasFn = routeFn(r)
            if (matched && hasFn) {
                Object.assign(req, matched)
                return true
            }
        })

        if (found) {
            let middleware = (r) => r.middleware

            if (middleware(found)) {
                await middleware(found)(ctx, routeFn(found))
            } else {
                await routeFn(found)(ctx)
            }
        }

        await next()
    }
}
