#!/usr/bin/env node

var stomp = require('./lib/stomp');

var num = process.argv[2];

stomp_args = {
    port: 61613,
    host: 'localhost',
    debug: true
}
// Could also add..
//{login: 'bah', password: 'bah'}

var client = new stomp.Stomp(stomp_args);

var queue = '/queue/test_stomp';

client.connect();

client.on('connected', function() {
    if (!num) num = 10;

    for (var i = 0; i < num; i++) {
        client.send({
            'destination': queue,
            'body': 'Testing' + i,
            'persistent': 'true'
        });
    }
    console.log('Produced ' + num + ' messages');
    client.disconnect();
});

client.on('error', function(error_frame) {
    console.log(error_frame.body);
    client.disconnect();
});

process.on('SIGINT', function() {
    client.disconnect();
});
