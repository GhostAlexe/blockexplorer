const mongoose = require('mongoose')
  , Schema = mongoose.Schema;
 
const StatsSchema = new Schema({
  coin: { type: String },
  count: { type: Number, default: 1 },
  last: { type: Number, default: 1 },
  supply: { type: Number, default: 0 },
  connections: { type: Number, default: 0 },
  last_price: { type: Number, default: 0 },
});

module.exports = mongoose.model('coinstats', StatsSchema);