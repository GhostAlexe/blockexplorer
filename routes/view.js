const express = require('express')
  , router = express.Router()
  , settings = require('../config/settings')
  , db = require('../lib/database')
  , lib = require('../lib/explorer')
  , qr = require('qr-image');

function route_get_block(res, blockhash) {
  lib.get_block(blockhash, function (block) {
    if (block !== 'There was an error. Check your console.') {
      if (blockhash === settings.genesis_block) {
        res.render('block', { active: 'block', block: block, confirmations: settings.confirmations, txs: 'GENESIS'});
      } else {
        db.get_txs(block, function(txs) {
          if (txs.length > 0) {
            res.render('block', { active: 'block', block: block, confirmations: settings.confirmations, txs: txs});
          } else {
            db.create_txs(block, function(){
              db.get_txs(block, function(ntxs) {
                if (ntxs.length > 0) {
                  res.render('block', { active: 'block', block: block, confirmations: settings.confirmations, txs: ntxs});
                } else {
                  route_get_index(res, 'Block not found: ' + blockhash);
                }
              });
            });
          }
        });
      }
    } else {
      route_get_index(res, 'Block not found: ' + blockhash);
    }
  });
}

function route_get_tx(res, txid) {
  if (txid === settings.genesis_tx) {
    route_get_block(res, settings.genesis_block);
  } else {
    db.get_tx(txid, function(tx) {
      if (tx) {
        lib.get_blockcount(function(blockcount) {
          res.render('tx', { active: 'tx', tx: tx, confirmations: settings.confirmations, blockcount: blockcount});
        });
      }
      else {
        lib.get_rawtransaction(txid, function(rtx) {
          if (rtx.txid) {
            lib.prepare_vin(rtx, function(vin) {
              lib.prepare_vout(rtx.vout, rtx.txid, vin, function(rvout, rvin) {
                lib.calculate_total(rvout, function(total){
                  const utx = {
                    txid: rtx.txid,
                    vin: rvin,
                    vout: rvout,
                    total: total.toFixed(8),
                    timestamp: rtx.time,
                    blockhash: !rtx.confirmations > 0 ? '-' : rtx.blockhash,
                    blockindex: !rtx.confirmations > 0 ? -1 : rtx.blockheight,
                  }
                  if (!rtx.confirmations > 0) {
                    res.render('tx', { active: 'tx', tx: utx, confirmations: settings.confirmations, blockcount:-1});
                  } else {
                    lib.get_blockcount(function(blockcount) {
                      res.render('tx', { active: 'tx', tx: utx, confirmations: settings.confirmations, blockcount: blockcount});
                    });
                  }
                });
              });
            });
          } else {
            route_get_index(res, null);
          }
        });
      }
    });
  }
}

function route_get_index(res, error) {
  res.render('index', { active: 'home', error: error, warning: null});
}

function route_get_address(res, hash, count) {
  db.get_address(hash, function(address) {
    if (address) {
      const txs = [];
      const hashes = address.txs.reverse();
      if (address.txs.length < count) {
        count = address.txs.length;
      }
      lib.syncLoop(count, function (loop) {
        let i = loop.iteration();
        db.get_tx(hashes[i].addresses, function(tx) {
          if (tx) {
            txs.push(tx);
            loop.next();
          } else {
            loop.next();
          }
        });
      }, function(){
        res.render('address', { active: 'address', address: address, txs: txs});
      });

    } else {
      route_get_index(res, hash + ' not found');
    }
  });
}

router.get('/', function(req, res) {
  route_get_index(res, null);
});

router.get('/richlist', function(req, res) {
  db.get_stats(settings.coin, function (stats) {
    db.get_richlist(settings.coin, function(richlist){
      if (richlist) {
        db.get_distribution(richlist, stats, function(distribution) {
          res.render('richlist', {
            active: 'richlist',
            balance: richlist.balance,
            stats: stats,
            dista: distribution.t_1_25,
            distb: distribution.t_26_50,
            distc: distribution.t_51_75,
            distd: distribution.t_76_100,
            diste: distribution.t_101plus,
          });
        });
      } else {
        route_get_index(res, null);
      }
    });
  });
});

router.get('/network', function(req, res) {
  res.render('network', {active: 'network'});
});

router.get('/tx/:txid', function(req, res) {
  route_get_tx(res, req.param('txid'));
});

router.get('/block/:hash', function(req, res) {
  route_get_block(res, req.param('hash'));
});

router.get('/address/:hash', function(req, res) {
  route_get_address(res, req.param('hash'), settings.txcount);
});

router.get('/address/:hash/:count', function(req, res) {
  route_get_address(res, req.param('hash'), req.param('count'));
});

module.exports = router;
