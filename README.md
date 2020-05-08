# koa-fs-router
Use the FS as your KOA router

### "features"

- ✅ 0 runtime dependencies
- ✅ < 100 loc
- ✅ little or no config
- ✅ parameterized paths
- ✅ parses query string

# Introduction

I have always enjoyed using my filesystem as a router, settings up directories and files and automatically mapping them into a route.

After seeing the success of Zeit, and their zero-config fs as a router implementation as well, I wanted to use a lirary for KoaJS that would automatically take a directory and make a router from its hierarchy.

I found [fs-router](https://github.com/jesseditson/fs-router) that did this exact same thing for micro, so I ported over his awesome library and made it work for KoaJS

### Usage

**router usage**
```javascript
// index.js
const { send } = require('micro')
let match = require('fs-router')(__dirname + '/routes')

module.exports = async function(req, res) {
  let matched = match(req)
  if (matched) return await matched(req, res)
  send(res, 404, { error: 'Not found' })
}
```

The above usage assumes you have a folder called `routes` next to the `index.js` file, that looks something like this:
```
routes/
├── foo
│   └── :param
│       └── thing.js
└── things
    └── :id.js
```

the above tree would generate the following routes:
```
/foo/:param/thing
/things/:id
```

**defining a route**
```javascript
// routes/foo/bar.js
const { send } = require('micro')

// respond to specific methods by exposing their verbs
module.exports.GET = async function(req, res) {
  // fs-router decorates your req object with param and query hashes
  send(res, 200, { params: req.params, query: req.query })
}
```

**path parameters**
```javascript
// routes/foos/:id.js
const { send } = require('micro')

// responds to any method at /foos/* (but not /foos or /foos/bar/baz)
module.exports = async function(req, res) {
  // params are always required when in a path, and the
  send(res, 200, { id: req.params.id })
}
```

**works great with async/await**
```javascript
const { send, json } = require('micro')
const qs = require('querystring')
require('isomorphic-fetch')

module.exports.GET = async function(req, res) {
  const query = qs.stringify(req.query)
  const data = await json(req)
  const res = await fetch(`http://some-url.com?${query}`)
  const response = await res.json()
  send(res, 200, response)
}
```

**typescript**
Use esModuleInterop and commonjs to import

```javascript
// tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "esModuleInterop": true,
    ...config
  }
}
```

use the `RequestHandler` type from this lib
```typescript
import { RequestHandler } from 'fs-router'

export const GET: RequestHandler = async (req, res) => {
    // req.params and req.query will be typed correctly
    send(res, 200, { params: req.params, query: req.query })
}
```

A full [typescript example](examples/typescript) is available in the [examples directory](examples)

**priority**
```javascript
module.exports.GET = async function(req, res) {
  send(res, 200, {})
}
// all routes are sorted by this property - the higher numbers are matched first.
// kind of like a z-index for your routes.
// note that equal priority will just sort based on the fs in the case of a collision, which is not guaranteed order on OSX/Linux
module.exports.priority = -1
```

**custom path**
```javascript
// routes/whatever.js
module.exports.GET = async function(req, res) {
  send(res, 200, {})
}
// exposing a "path" will override the fs-generated one.
// This is nice if you wanted to avoid making a really deep tree for a one-off path (like for oauth callbacks)
// or if you just want to avoid putting `:` in your file/folder names or something
module.exports.path = '/foo/bar'
```

**index routes**
```javascript
// routes/index.js
module.exports.GET = async function(req, res) {
  return 'hello!'
}
// The above route would be reachable at / and /index.
// This works for deep paths (/thing/index.js maps to /thing and /thing/index)
// and even for params (/thing/:param/index.js maps to /thing/* and /thing/*/index).
```

**filter routes**
```javascript
// index.js
const { send } = require('micro')

// set up config to filter only paths including `foo`
const config = {filter: f => f.indexOf('foo') !== -1}

// pass config to `fs-router` as optional second paramater
let match = require('fs-router')(__dirname + '/routes', config)

module.exports = async function(req, res) {
  let matched = match(req)
  if (matched) return await matched(req, res)
  send(res, 404, { error: 'Not found' })
}
```

The above usage assumes you have a folder called `routes` next to the `index.js` file, that looks something like this:
```
routes/
├── foo
│   ├── index.js
│   └── thing.js
└── bar
    ├── index.js
    ├── foo.js
    └── thing.js
```

the above tree would generate the following routes:
```
/foo
/foo/thing
/bar/foo
```

**Multiple file extensions**
```javascript
// index.js
const { send } = require('micro')

// set up the config to both include .js and .ts files.
const config = {ext: ['.js', '.ts']}

// pass config to `fs-router` as optional second paramater
let match = require('fs-router')(__dirname + '/routes', config)

module.exports = async function(req, res) {
  let matched = match(req)
  if (matched) return await matched(req, res)
  send(res, 404, { error: 'Not found' })
}
```