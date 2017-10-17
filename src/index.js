'use strict';

const EventEmitter = require('eventemitter2');
const JSONB = require('json-buffer');

const loadStore = opts => {
	const adapters = {
		sqlite: require('./keyv-sqlite-shrink')
	};
	if (opts.adapter || opts.uri) {
		const adapter = opts.adapter || /^[^:]*/.exec(opts.uri)[0];
		return new (adapters[adapter])(opts);
	}
	return new Map();
};

class Keyv extends EventEmitter {
	constructor(uri, opts) {
		super();
		this.opts = Object.assign(
			{ namespace: 'keyv' },
			(typeof uri === 'string') ? { uri } : uri,
			opts
		);

		if (!this.opts.store) {
			const adapterOpts = Object.assign({}, this.opts);
			this.opts.store = loadStore(adapterOpts);
		}

		if (typeof this.opts.store.on === 'function') {
			this.opts.store.on('error', err => this.emit('error', err));
		}

		this.opts.store.namespace = this.opts.namespace;
	}

	_getKeyPrefix(key) {
		return `${this.opts.namespace}:${key}`;
	}

	get(key) {
		key = this._getKeyPrefix(key);
		const store = this.opts.store;
		return Promise.resolve()
			.then(() => store.get(key))
			.then(data => {
				data = (typeof data === 'string') ? JSONB.parse(data) : data;
				if (data === undefined) {
					return undefined;
				}
				if (!store.ttlSupport && typeof data.expires === 'number' && Date.now() > data.expires) {
					this.delete(key);
					return undefined;
				}
				return store.ttlSupport ? data : data.value;
			});
	}

	set(key, value, ttl) {
		key = this._getKeyPrefix(key);
		if (typeof ttl === 'undefined') {
			ttl = this.opts.ttl;
		}
		if (ttl === 0) {
			ttl = undefined;
		}
		const store = this.opts.store;

		return Promise.resolve()
			.then(() => {
				if (!store.ttlSupport) {
					const expires = (typeof ttl === 'number') ? (Date.now() + ttl) : null;
					value = { value, expires };
				}
				return store.set(key, JSONB.stringify(value), ttl);
			})
			.then(() => true);
	}

	delete(key) {
		key = this._getKeyPrefix(key);
		const store = this.opts.store;
		return Promise.resolve()
			.then(() => store.delete(key));
	}

	shrink() {
		const store = this.opts.store;
		if (store.ttlSupport) {
			if (typeof store.shrink === 'function') {
				return store.shrink();
			}
			return Promise.resolve();
		}
		if (store instanceof Map) {
			return Promise.resolve()
				.then(() => {
					const deletions = [];
					for (let [key, data] of store) {
						if (key.lastIndexOf(this.opts.namespace, 0) === -1) {
							continue;
						}
						data = (typeof data === 'string') ? JSONB.parse(data) : data;
						if (typeof data.expires === 'number' && Date.now() > data.expires) {
							deletions.push(this.delete(key));
						}
					}
					return Promise.all(deletions);
				})
				.then(() => undefined);
		}
		return Promise.resolve();
	}

	clear() {
		const store = this.opts.store;
		return Promise.resolve()
			.then(() => store.clear());
	}
}

module.exports = Keyv;
