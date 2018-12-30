const express = require('express')
  , router = express.Router()
  , settings = require('../config/settings')
  , db = require('../lib/database')
  , lib = require('../lib/explorer')

router.get('/getmoneysupply', function(req,res){
  lib.get_supply(function(supply){
    res.send(' '+supply);
  });
});

router.get('/getaddress/:hash', function(req,res){
  db.get_address(req.param('hash'), function(address){
    if (address) {
      const a_ext = {
        address: address.a_id,
        sent: (address.sent / 100000000),
        received: (address.received / 100000000),
        balance: (address.balance / 100000000).toString().replace(/(^-+)/mg, ''),
        last_txs: address.txs,
      };
      res.send(a_ext);
    } else {
      res.send({ error: 'address not found.', hash: req.param('hash')})
    }
  });
});

router.get('/getbalance/:hash', function(req,res){
  db.get_address(req.param('hash'), function(address){
    if (address) {
      res.send((address.balance / 100000000).toString().replace(/(^-+)/mg, ''));
    } else {
      res.send({ error: 'address not found.', hash: req.param('hash')})
    }
  });
});

router.get('/getdistribution', function(req,res){
  db.get_richlist(settings.coin, function(richlist){
    db.get_stats(settings.coin, function(stats){
      db.get_distribution(richlist, stats, function(dist){
        res.send(dist);
      });
    });
  });
});

router.get('/getlasttxs/:min', function(req,res){
  db.get_last_txs(settings.index.last_txs, (req.params.min * 100000000), function(txs){
    res.send({data: txs});
  });
});

router.get('/connections', function(req,res){
  db.get_peers(function(peers){
    res.send({data: peers});
  });
});

router.get('/summary', function(req, res) {
  lib.get_connectioncount(function(connections){
    lib.get_blockcount(function(blockcount) {
      db.get_stats(settings.coin, function (stats) {
        res.send({ data: [{
            supply: stats.supply,
            lastPrice: stats.last_price,
            connections: connections,
            blockcount: blockcount
          }]});
      });
    });
  });
});

module.exports = router;