## frame

The `Frame` module provides an object representation of a `Stomp` frame.

### frame.Frame

An instance of the `Frame` object.

    var frame = new frame.Frame();

### frame.Frame.build_frame()

Build a frame object from an object of arguments.

    var args = {
        command: '',
        headers: {},
        body: ''
    };

    this_frame = frame.build_frame(args);

### frame.Frame.as_string()

A string representation of the Frame object.
Useful for sending over a raw socket.

    var frame_str = this_frame.as_string();
