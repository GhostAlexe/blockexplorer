const mongoose = require('mongoose')
  , lib = require('../lib/explorer')
  , db = require('../lib/database')
  , settings = require('../config/settings')
  , request = require('request');

function exit() {
  mongoose.disconnect();
  process.exit(0);
}

const databaseUri = settings.database.uri;

mongoose.connect(databaseUri, function(err) {
  if (err) {
    exit();
  } else {
    request({uri: 'http://127.0.0.1:' + settings.port + '/api/getpeerinfo', json: true}, function (error, response, body) {
      lib.syncLoop(body.length, function (loop) {
        let i = loop.iteration();
        let address = body[i].addr.split(':')[0];
        db.find_peer(address, function(peer) {
          if (peer) {
            loop.next();
          } else {
            request({uri: 'http://api.ipstack.com/' + address + '?access_key=a0b8a9a5a3193a0cfbeaf17c7102f37e&output=json&legacy=1'}, function (error, response, geo) {
              db.create_peer({
                address: address,
                protocol: body[i].version,
                version: body[i].subver.replace('/', '').replace('/', ''),
                country: JSON.parse(geo).country_name,
              }, function(){
                loop.next();
              });
            });
          }
        });
      }, function() {
        exit();
      });
    });
  }
});
