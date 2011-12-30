#!/usr/bin/env node

var stomp = require('stomp');

var num = process.argv[2];

// Set to true if you want a receipt
// of all messages sent.
var receipt = true;

// Set debug to true for more verbose output.
// login and passcode are optional (required by rabbitMQ)
var stomp_args = {
    port: 61613,
    host: 'localhost',
    debug: false,
    login: 'guest',
    passcode: 'guest',
}

var client = new stomp.Stomp(stomp_args);

var queue = '/queue/test_stomp';

client.connect();

function sleep(milliSeconds) {
    var startTime = new Date().getTime();
    while (new Date().getTime() < startTime + milliSeconds);
}

client.on('connected', function() {
    num = num || 1000;
    for (var i = 0; i < num; i++) {
        client.send({
            'destination': queue,
            'body': 'Testing\n\ntesting1\n\ntesting2 ' + i,
            'persistent': 'true'
        }, receipt);
        sleep(250);
    }
    console.log('Produced ' + num + ' messages');
    client.disconnect();
});

client.on('receipt', function(receipt) {
    console.log("RECEIPT: " + receipt);
});

client.on('error', function(error_frame) {
    console.log(error_frame.body);
    client.disconnect();
});

process.on('SIGINT', function() {
    console.log('Produced ' + num + ' messages');
    client.disconnect();
    process.exit(0);
});
