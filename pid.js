
var mongoose = require('mongoose');

var pidSchema = mongoose.Schema({
	id: {type: String, required: true, unique: true},
	createdAt: {type: Date, expires: '24h', default: Date.now}
})

module.exports = mongoose.model('Pid', pidSchema);