<h1 align="center">
	<img width="250" src="https://rawgit.com/lukechilds/keyv/master/media/logo.svg" alt="keyv">
	<br>
	<br>
</h1>

This is a fork of Keyv that supports shrinking the cache by removing expired data.

**You should first read [about Keyv](https://github.com/lukechilds/keyv) on the original project page.**

If you need to periodically clean up your cache and the storage you use doesn't support TTL functionality (i.e. it isn't either Redis or MongoDB), then you can use this module as a drop-in replacement for Keyv. 99% of Luke's code remains the same. You gain exactly one more function:

#### .shrink()

Delete all **expired** entries in the current namespace. Returns `undefined`.

### Requirements

`keyv-shrink` is enough if you want to cache everything in memory.

If you want to use an sql-based storage, in addition to keyv-shrink you need to install one of the following storage adapters:

```
npm install --save keyv-sqlite-shrink
npm install --save keyv-postgres-shrink
npm install --save keyv-mysql-shrink
```

Create a new Keyv-shrink instance, passing your connection string if applicable. Keyv-shrink will automatically load the correct storage adapter.

```js
const Keyv = require('keyv-shrink');

// One of the following
const keyv = new Keyv();
const keyv = new Keyv('sqlite://path/to/database.sqlite');
const keyv = new Keyv('postgresql://user:pass@localhost:5432/dbname');
const keyv = new Keyv('mysql://user:pass@localhost:3306/dbname');

// Handle DB connection errors
keyv.on('error' err => console.log('Connection Error', err));

await keyv.set('foo', 'expires in 1 second', 1000); // true
await keyv.set('foo', 'never expires'); // true
await keyv.get('foo'); // 'never expires'
await keyv.delete('foo'); // true
await keyv.clear(); // undefined
await keyv.shrink(); // undefined
```

Everything else works just like vanilla Keyv.

## License

MIT © MySidesTheyAreGone

MIT © Luke Childs
