module.exports = {
  "coin": "Digital World Exchange",

  "port" : 3001,

  "database": {
    "uri": "mongodb://dwe:dweexplorer181230@localhost:27017/explorerdb"
  },

  "update_timeout": 60,
  "check_timeout": 250,

  "rpc": {
    "host": "localhost",
    "port": 51473,
    "user": "dwerpc",
    "pass": "HS8qFPHHoQex2sVVifYt49DVMHY41aHqe4PFVzfhxjwX"
  },

  "confirmations": 6,

  "index": {
    "difficulty": "Hybrid",
    "last_txs": 100
  },

  "genesis_tx": "1b2ef6e2f28be914103a277377ae7729dcd125dfeb8bf97bd5964ba72b6dc39b",
  "genesis_block": "000009feb354eae6f0b66e4b453ba7cbc25235b41154765059addc2d8af79b0b",

  "txcount": 100
};
