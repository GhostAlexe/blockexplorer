const mongoose = require('mongoose')
  , Schema = mongoose.Schema;
 
const RichlistSchema = new Schema({
  coin: { type: String },
  balance: { type: Array, default: [] },
});

module.exports = mongoose.model('Richlist', RichlistSchema);