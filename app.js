const express = require('express')
  , path = require('path')
  , logger = require('morgan')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , bitcoinapi = require('bitcoin-node-api')
  , settings = require('./config/settings')
  , view = require('./routes/view')
  , api = require('./routes/api')

const app = express();

bitcoinapi.setWalletDetails(settings.rpc);
bitcoinapi.setAccess('only', ['getblock', 'getblockcount', 'getblockhash', 'getconnectioncount', 'getinfo', 'getpeerinfo', 'getrawtransaction', 'gettxoutsetinfo']);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', view);
app.use('/api', bitcoinapi.app);
app.use('/ext', api);

module.exports = app;
