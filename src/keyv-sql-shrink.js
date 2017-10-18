'use strict';

const EventEmitter = require('eventemitter2');
const { Sql } = require('react-native-sql');

class KeyvSql extends EventEmitter {
  constructor(opts) {
    super();
    this.ttlSupport = true;

    this.opts = Object.assign({
      table: 'keyv',
      keySize: 255
    }, opts);

    this.sql = new Sql(opts.dialect);

    this.entry = this.sql.define({
      name: this.opts.table,
      columns: [
        {
          name: 'key',
          primaryKey: true,
          dataType: `VARCHAR(${Number(this.opts.keySize)})`
        },
        {
          name: 'value',
          dataType: 'TEXT'
        },
        {
          name: 'expiry',
          dataType: 'BIGINT'
        }
      ]
    });
    const createTable = this.entry.create().ifNotExists().toString();

    const connected = this.opts.connect().
      then(query => query(createTable).then(() => query)).
      catch(err => this.emit('error', err));

    this.query = sqlString => connected.then(query => query(sqlString));
  }

  get(key) {
    const select = this.entry.select().where({ key }).toString();
    return this.query(select).then(rows => {
      const row = rows[0];
      if (row === undefined) {
        return undefined;
      }
      if (row.expiry !== null && row.expiry < Date.now()) {
        this.delete(key);
        return undefined;
      }
      return row.value;
    });
  }

  set(key, value, ttl) {
    if (typeof value === 'undefined') {
      return Promise.resolve(undefined);
    }
    let expiry;
    if (typeof ttl === 'number') {
      expiry = Date.now() + ttl;
    } else {
      expiry = null;
    }
    let upsert;
    if (this.opts.dialect === 'mysql') {
      value = value.replace(/\\/g, '\\\\');
    }
    if (this.opts.dialect === 'postgres') {
      upsert = this.entry.insert({ key, value, expiry }).
        onConflict({ columns: ['key'], update: ['value', 'expiry'] }).
        toString();
    } else {
      upsert = this.entry.replace({ key, value, expiry }).toString();
    }
    return this.query(upsert);
  }

  delete(key) {
    const select = this.entry.select().where({ key }).toString();
    const del = this.entry.delete().where({ key }).toString();
    return this.query(select).then(rows => {
      const row = rows[0];
      if (row === undefined) {
        return false;
      }
      return this.query(del).then(() => true);
    });
  }

  shrink() {
    const del = this.entry.delete(this.entry.key.like(`${this.namespace}:%`)).
      and(this.entry.expiry.isNotNull()).
      and(this.entry.expiry.lte(Date.now())).
      toString();
    return this.query(del).then(() => undefined);
  }

  clear() {
    const del = this.entry.delete(this.entry.key.like(`${this.namespace}:%`)).
      toString();
    return this.query(del).then(() => undefined);
  }
}

module.exports = KeyvSql;