'use strict';

const KeyvSql = require('./keyv-sql-shrink');
const sqlite3 = require('react-native-sqlite-2').default;

class KeyvSqlite extends KeyvSql {
  constructor(opts) {
    opts = Object.assign({
      dialect: 'sqlite',
      uri: 'sqlite://:memory:'
    }, opts);
    opts.db = opts.uri.replace(/^sqlite:\/\//, '');

    opts.connect = () => new Promise((resolve, reject) => {
      const db = sqlite3.openDatabase(opts.db, '1.0', 'Test Database', 200000);
      resolve(db);
    }).then(db => {
      const executeSql = function(stringSql, params = []) {
        return new Promise((resolve, reject) => {
          db.transaction((tx) => {
            tx.executeSql(stringSql, params, (tx, results) => {
              let rows = [];
              let len = results.rows.length;
              for (let i = 0; i < len; i++) {
                let row = results.rows.item(i);
                rows.push(row);
              }
              resolve(rows);
            }, (err) => {
              reject(err);
            });
          });
        });
      };
      return executeSql;
    });

    super(opts);
  }
}

module.exports = KeyvSqlite;