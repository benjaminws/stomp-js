#!/usr/bin/env node

var stomp = require('./lib/stomp');

//{'login': 'bah', 'password': 'bah'}
var client = new stomp.Stomp(61613, 'localhost', true);

var headers = {
    'destination': '/queue/test',
    'ack': 'auto'
};

var messages = [];

client.connect();

client.on('connected', function() {
    client.subscribe(headers);
    console.log('Connected');
});

client.on('message', function(message) {
    messages.push(message);
});

client.on('error', function(error_frame) {
    console.log(error_frame.body);
});

process.on('SIGINT', function() {
    console.log(messages.length);
    client.disconnect();
});
