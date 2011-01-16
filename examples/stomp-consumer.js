#!/usr/bin/env node

var sys = require('sys');
var stomp = require('stomp');

// Set debug to true for more verbose output.
// login and passcode are optional (required by rabbitMQ)
var stomp_args = {
    port: 61613,
    host: 'localhost',
    debug: false,
    login: 'guest',
    passcode: 'guest',
};

var client = new stomp.Stomp(stomp_args);

// 'activemq.prefetchSize' is optional.
// Specified number will 'fetch' that many messages
// and dump it to the client.
var headers = {
    destination: '/queue/test_stomp',
    ack: 'client',
//    'activemq.prefetchSize': '10'
};

var messages = 0;

client.connect();

client.on('connected', function() {
    client.subscribe(headers);
    console.log('Connected');
});

client.on('message', function(message) {
    client.ack(message.headers['message-id']);
    messages++;
});

client.on('error', function(error_frame) {
    console.log(error_frame.body);
    client.disconnect();
});

process.on('SIGINT', function() {
    console.log('\nConsumed ' + messages + ' messages');
    client.disconnect();
});
