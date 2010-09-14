stomp-js
========

## Overview

An exercise with node.js to implement the STOMP protocol.
The design & implementation is heavily inspired by [python-stomp](http://bitbucket.org/benjaminws/python-stomp/), with an evented twist.

This is merely the first iteration; a complete spike.  I will be rewriting it from the ground up with BDD.

## Examples

### Consumer

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
        messages.push(message);
    });

    client.on('error', function(error_frame) {
        console.log(error_frame.body);
    });

    process.on('SIGINT', function() {
        console.log('\nConsumed ' + messages.length + ' messages');
        client.disconnect();
    });

### Producer

    #!/usr/bin/env node

    var stomp = require('./lib/stomp');

    var num = process.argv[2];

    var stomp_args = {
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
