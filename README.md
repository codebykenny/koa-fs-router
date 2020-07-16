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
const koa = require('koa')
const router = require('koa-fs-router')(__dirname + '/routes')
const app = new koa()

app.use(router)
app.listen(3000)
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
module.exports = async (ctx) => {
	ctx.body = "Testing..."
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

**priority**
```javascript
module.exports.GET = async (ctx) => {
	ctx.body = "Testing..."
}
// all routes are sorted by this property - the higher numbers are matched first.
// kind of like a z-index for your routes.
// note that equal priority will just sort based on the fs in the case of a collision, which is not guaranteed order on OSX/Linux
module.exports.priority = -1
```

**custom path**
```javascript
// routes/whatever.js
module.exports.GET = async (ctx) => {
	ctx.body = "Testing..."
}
// exposing a "path" will override the fs-generated one.
// This is nice if you wanted to avoid making a really deep tree for a one-off path (like for oauth callbacks)
// or if you just want to avoid putting `:` in your file/folder names or something
module.exports.path = '/foo/bar'
```

**index routes**
```javascript
// routes/index.js
module.exports.GET = async (ctx) => {
	ctx.body = "Testing..."
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
