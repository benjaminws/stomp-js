#!/usr/bin/env node

var stomp = require('./lib/stomp');

var client = new stomp.Stomp(61613, 'localhost', true, {'login': 'bah', 'password': 'bah'});

var queue = '/queue/test';

var headers = {'destination': queue, 'ack': 'client'};

client.connect();

client.on('connected', function() {
    client.subscribe(headers);

    for (var i = 0; i < 10; i++) {
        console.log(i);
        client.send({'destination': queue,
                     'body': 'Testing' + i,
                     'persistent': 'true'
        });
    }
});

client.on('message', function(message) {
    console.log(message.body);
});
