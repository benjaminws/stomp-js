#!/usr/bin/env node

var stomp = require('./lib/stomp');

var num = process.argv[2];

//{'login': 'bah', 'password': 'bah'}
var client = new stomp.Stomp(61613, 'localhost', true);

var queue = '/queue/test';

client.connect();

client.on('connected', function() {
    if (!num) num = 10;

    for (var i = 0; i < num; i++) {
        console.log(i);
        client.send({
            'destination': queue,
            'body': 'Testing' + i,
            'persistent': 'true'
        });
    }
    client.disconnect();
});

client.on('error', function(error_frame) {
    console.log(error_frame.body);
    client.disconnect();
});

process.on('SIGINT', function() {
    client.disconnect();
});
