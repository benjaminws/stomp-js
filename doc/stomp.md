## stomp

The `Stomp` module provides you with a client interface for interacting with STOMP messaging brokers

### stomp.Stomp

An instance of the `Stomp` object.  Initialized like so:

    var stomp_args = {
        port: 61613,
        host: 'localhost',
        debug: false,
        login: 'guest',
        passcode: 'guest',
    };

    var client = new stomp.Stomp(stomp_args);

If debug is set to true, extra output will be printed to the console.

#### stomp.Stomp.connect()

Initializes the connection to the STOMP broker.

#### stomp.Stomp.disconnect()

Disconnect from the STOMP broker

#### stomp.Stomp.subscribe(headers)

Subscribe to destination (queue or topic)

Headers typically looks like so:

    var headers = {
        destination: '/queue/queue_name',
        ack: 'client',
    };

#### stomp.Stomp.unsubscribe(headers)

Unsubscribe from destination (queue or topic)

Headers typically look like so:

    var headers = {
        destination: '/queue/queue_name',
    };

#### stomp.Stomp.ack(message_id)

Acknowledge received message.
Only needed if 'ack': 'client' set in `stomp.Stomp.subscribe()` headers.

message_id is the message number you wish to acknowledge.

#### stomp.Stomp.begin()

Begin transaction

returns 'transaction id'

#### stomp.Stomp.commit(transaction_id)

Commit transaction.

'transaction_id' will be a transaction provided by `stomp.Stomp.begin()`.

#### stomp.Stomp.abort(transaction_id)

Abort transaction.

'transaction_id' will be a transaction provided by `stomp.Stomp.begin()`.

### stomp.Stomp.send(headers, [want_receipt])

Send a message to the stomp broker.

    client.send({
        'destination': subscribed_queue_or_topic,
        'body': 'Message Body",
        'persistent': 'true'
    }, false);

If 'want_receipt' is true, it will add a 'receipt' header to the `Frame` object.
If there is a receipt, it will be emitted when received.
`stomp.Stomp.send()` will return the `Frame` object sent to the broker.  This is useful for debugging.

---

`stomp.Stomp` is an `EventEmitter` and will emit the following events:

#### Event: 'connected'

This event is triggered once the socket is connected and the "CONNECT" command has been sent to the STOMP broker

`function () { }`

    client.on('connected', function() {
        // This would be a good time to subscribe to a queue or topic
    });

#### Event: 'message'

This event is triggered when a message is received by `stomp.Stomp` and is ready for consumption.

The message will be passed as an argument.

`function (message) { }`

    client.on('message', function(message) {
        // Handle message with ack?
    });

#### Event: 'receipt'

This event is triggered when a receipt is received.

`function (receipt_id) { }`

    client.on('receipt', function (receipt_id) {
        // Validation code
    });

#### Event: 'error'

This event is triggered when an error is received from the broker.

    client.on('error', function(error_frame) {
        // Handle accordingly
        // console.log(error_frame.body);
    });
