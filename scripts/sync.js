const mongoose = require('mongoose')
  , db = require('../lib/database')
  , Tx = require('../models/tx')  
  , Address = require('../models/address')  
  , Richlist = require('../models/richlist')  
  , Stats = require('../models/stats')  
  , settings = require('../config/settings')
  , fs = require('fs');

let mode = 'update';
const database = 'index';

switch(process.argv[3])
{
  case 'update':
    mode = 'update';
    break;
  case 'reindex':
    mode = 'reindex';
    break;
}

function create_lock(cb) {
  if ( database === 'index' ) {
    fs.appendFile('./tmp/' + database + '.pid', process.pid, function (err) {
      if (err) {
        process.exit(1);
      } else {
        return cb();
      }
    });
  } else {
    return cb();
  }
}

function remove_lock(cb) {
  if ( database === 'index' ) {
    fs.unlink('./tmp/' + database + '.pid', function (err){
      if(err) {
        process.exit(1);
      } else {
        return cb();
      }
    });
  } else {
    return cb();
  }  
}

function is_locked(cb) {
  if ( database === 'index' ) {
    fs.exists('./tmp/' + database + '.pid', function (exists){
      if(exists) {
        return cb(true);
      } else {
        return cb(false);
      }
    });
  } else {
    return cb();
  } 
}

function exit() {
  remove_lock(function(){
    mongoose.disconnect();
    process.exit(0);
  });
}

const databaseUri = settings.database.uri;

is_locked(function (exists) {
  if (exists) {
    console.log("Script already running..");
    process.exit(0);
  } else {
    create_lock(function (){
      console.log("script launched with pid: " + process.pid);
      mongoose.connect(databaseUri, function(err) {
        if (err) {
          console.log('Unable to connect to database: %s', databaseUri);
          exit();
        } else if (database === 'index') {
          db.check_stats(settings.coin, function(exists) {
            if (exists === false) {
              console.log('Run \'npm start\' to create database structures before running this script.');
              exit();
            } else {
              db.update_db(settings.coin, function(){
                db.get_stats(settings.coin, function(stats){
                  if (mode === 'reindex') {
                    Tx.remove({}, function() {
                      Address.remove({}, function() {
                        Richlist.update({coin: settings.coin}, {
                          balance: [],
                        }, function() {
                          Stats.update({coin: settings.coin}, { 
                            last: 0,
                          }, function() {
                            console.log('index cleared (reindex)');
                          }); 
                          db.update_tx_db(settings.coin, 1, stats.count, settings.update_timeout, function(){
                            db.update_richlist('balance', function(){
                              db.get_stats(settings.coin, function(nstats){
                                console.log('reindex complete (block: %s)', nstats.last);
                                exit();
                              });
                            });
                          });
                        });
                      });
                    });              
                  } else if (mode === 'update') {
                    db.update_tx_db(settings.coin, stats.last, stats.count, settings.update_timeout, function(){
                      db.update_richlist('balance', function(){
                        db.get_stats(settings.coin, function(nstats){
                          console.log('update complete (block: %s)', nstats.last);
                          exit();
                        });
                      });
                    });
                  }
                });
              });
            }
          });
        }
      });
    });
  }
});