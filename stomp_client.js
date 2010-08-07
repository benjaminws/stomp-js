var Stomp = require('./stomp');

var client = new Stomp(61613, 'localhost');

client.connect();
