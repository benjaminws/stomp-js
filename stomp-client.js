#!/usr/bin/env node

var Stomp = require('./lib/stomp');

var client = new Stomp(61613, 'localhost', true);

client.connect();
