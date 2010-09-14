#!/usr/bin/env node

var stomp = require('./lib/stomp');

var stomp_args = {
    port: 61613,
    host: 'localhost',
    debug: true
}
// Could also add..
//{login: 'bah', password: 'bah'}

var client = new stomp.Stomp(stomp_args);

var headers = {
    destination: '/queue/test_stomp',
    ack: 'client'
};

var messages = [];

client.connect();

client.on('connected', function() {
    client.subscribe(headers);
    console.log('Connected');
});

client.on('message', function(message) {
    if (!client.utils.really_defined(message.headers['message-id'])) {
        console.log(message);
        return;
    }
    client.ack(message.headers['message-id']);
    messages.push(message);
});

client.on('error', function(error_frame) {
    console.log(error_frame.body);
    client.disconnect();
});

process.on('SIGINT', function() {
    console.log('\nConsumed ' + messages.length + ' messages');
    client.disconnect();
});
