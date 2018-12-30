const request = require('request')
  , settings = require('../config/settings')
  , Address = require('../models/address');

const base_url = 'http://127.0.0.1:' + settings.port + '/api/';

function convert_to_satoshi(amount) {
  return parseInt(amount.toFixed(8).toString().replace('.', ''));
}

module.exports = {
  get_connectioncount: function(cb) {
    request({uri: base_url + 'getconnectioncount', json: true}, function (error, response, body) {
      return cb(body);
    });
  },

  get_blockcount: function(cb) {
    request({uri: base_url + 'getblockcount', json: true}, function (error, response, body) {
      return cb(body);
    });
  },

  get_blockhash: function(height, cb) {
    request({uri: base_url + 'getblockhash?height=' + height, json: true}, function (error, response, body) {
      return cb(body);
    });
  },

  get_block: function(hash, cb) {
    request({uri: base_url + 'getblock?hash=' + hash, json: true}, function (error, response, body) {
      return cb(body);
    });
  },

  get_rawtransaction: function(hash, cb) {
    request({uri: base_url + 'getrawtransaction?txid=' + hash + '&decrypt=1', json: true}, function (error, response, body) {
      return cb(body);
    });
  },

  syncLoop: function(iterations, process, exit){
    let index = 0, done = false, shouldExit = false;
    let loop = {
      next:function(){
          if(done){
              if(shouldExit && exit){
                  exit(); // Exit if we're done
              }
              return; // Stop the loop if we're done
          }
          // If we're not finished
          if(index < iterations){
              index++; // Increment our index
              if (index % 100 === 0) { //clear stack
                setTimeout(function() {
                  process(loop); // Run our process, pass in the loop
                }, 1);
              } else {
                 process(loop); // Run our process, pass in the loop
              }
          // Otherwise we're done
          } else {
              done = true; // Make sure we say we're done
              if(exit) exit(); // Call the callback on exit
          }
      },
      iteration:function(){
          return index - 1; // Return the loop number we're on
      },
      break:function(end){
          done = true; // End the loop
          shouldExit = end; // Passing end as true means we still call the exit callback
      }
    };
    loop.next();
    return loop;
  },

  get_supply: function(cb) {
    Address.find({}, 'balance').where('balance').gt(0).exec(function(err, docs) {
      let count = 0;
      module.exports.syncLoop(docs.length, function (loop) {
        let i = loop.iteration();
        count = count + docs[i].balance;
        loop.next();
      }, function(){
        return cb(count/100000000);
      });
    });
  },

  is_unique: function(array, object, cb) {
    let unique = true;
    let index = null;
    module.exports.syncLoop(array.length, function (loop) {
      var i = loop.iteration();
      if (array[i].addresses == object) {
        unique = false;
        index = i;
        loop.break(true);
        loop.next();
      } else {
        loop.next();
      }
    }, function(){
      return cb(unique, index);
    });
  },

  calculate_total: function(vout, cb) {
    var total = 0;
    module.exports.syncLoop(vout.length, function (loop) {
      var i = loop.iteration();
      total = total + vout[i].amount;
      loop.next();
    }, function(){
      return cb(total);
    });
  },

  prepare_vout: function(vout, txid, vin, cb) {
    var arr_vout = [];
    var arr_vin = [];
    arr_vin = vin;
    module.exports.syncLoop(vout.length, function (loop) {
      var i = loop.iteration();
      // make sure vout has an address
      if (vout[i].scriptPubKey.type != 'nonstandard' && vout[i].scriptPubKey.type != 'nulldata') { 
        // check if vout address is unique, if so add it array, if not add its amount to existing index
        //console.log('vout:' + i + ':' + txid);
        module.exports.is_unique(arr_vout, (vout[i].scriptPubKey.addresses || ['zDwe Address'])[0], function(unique, index) {
          if (unique == true) {
            // unique vout
            arr_vout.push({addresses: (vout[i].scriptPubKey.addresses || ['zDwe Address'])[0], amount: convert_to_satoshi(parseFloat(vout[i].value))});
            loop.next();
          } else {
            // already exists
            arr_vout[index].amount = arr_vout[index].amount + convert_to_satoshi(parseFloat(vout[i].value));
            loop.next();
          }
        });
      } else {
        // no address, move to next vout
        loop.next();
      }
    }, function(){
      if (vout[0].scriptPubKey.type == 'nonstandard') {
        if ( arr_vin.length > 0 && arr_vout.length > 0 ) {
          if (arr_vin[0].addresses == arr_vout[0].addresses) {
            //PoS
            arr_vout[0].amount = arr_vout[0].amount - arr_vin[0].amount;
            arr_vin.shift();
            return cb(arr_vout, arr_vin);
          } else {
            return cb(arr_vout, arr_vin);
          }
        } else {
          return cb(arr_vout, arr_vin);
        }
      } else {
        return cb(arr_vout, arr_vin);
      }
    });
  },

  get_input_addresses: function(input, vout, cb) {
    var addresses = [];
    if (input.coinbase) {
      var amount = 0;
      module.exports.syncLoop(vout.length, function (loop) {
        var i = loop.iteration();
          amount = amount + parseFloat(vout[i].value);  
          loop.next();
      }, function(){
        addresses.push({hash: 'coinbase', amount: amount});
        return cb(addresses);
      });
    } else {
      module.exports.get_rawtransaction(input.txid, function(tx){
        if (tx) {
          module.exports.syncLoop((tx.vout || {length: 0}).length, function (loop) {
            var i = loop.iteration();
            if (tx.vout[i].n == input.vout) {
              if (tx.vout[i].scriptPubKey.addresses) {
                addresses.push({hash: tx.vout[i].scriptPubKey.addresses[0], amount:tx.vout[i].value});  
              }
              loop.break(true);
              loop.next();
            } else {
              loop.next();
            } 
          }, function(){
            return cb(addresses);
          });
        } else {
          return cb();
        }
      });
    }
  },

  prepare_vin: function(tx, cb) {
    var arr_vin = [];
    module.exports.syncLoop(tx.vin.length, function (loop) {
      var i = loop.iteration();
      module.exports.get_input_addresses(tx.vin[i], tx.vout, function(addresses){
        if (addresses && addresses.length) {
          //console.log('vin');
          module.exports.is_unique(arr_vin, addresses[0].hash, function(unique, index) {
            if (unique == true) {
              arr_vin.push({addresses:addresses[0].hash, amount: convert_to_satoshi(parseFloat(addresses[0].amount))});
              loop.next();
            } else {
              arr_vin[index].amount = arr_vin[index].amount + convert_to_satoshi(parseFloat(addresses[0].amount));
              loop.next();
            }
          });
        } else {
          loop.next();
        }
      });
    }, function(){
      return cb(arr_vin);
    });
  }
};
