// grove_zero_extension.js
//
// This is an extension for development and testing of the Scratch Javascript Extension API.

(function(ext) {
    
    var BTN_UP = 0,
    BTN_DOWN = 1,
    BTN_HELD = 2;
    
    var buttonState = {A: 0, B: 0};
    
    ext.resetAll = function(){};
    
    // Hats / triggers
    ext.whenButtonPressed = function(btn) {
        if (btn === 'any')
        return buttonState['A'] == BTN_DOWN | buttonState['B'] == BTN_DOWN;
        return buttonState[btn] == BTN_DOWN;
    };

    // Reporters
    

    // Private logic
    

    // Extension API interactions
    var potentialDevices = [];
    ext._deviceConnected = function(dev) {
        potentialDevices.push(dev);

        if (!device) {
            tryNextDevice();
        }
    }

    var poller = null;
    var watchdog = null;
    function tryNextDevice() {
        // If potentialDevices is empty, device will be undefined.
        // That will get us back here next time a device is connected.
        device = potentialDevices.shift();
        if (!device) return;

        device.open({ stopBits: 0, bitRate: 115200, ctsFlowControl: 0 });
        device.set_receive_handler(function(data) {
            console.log('Received: ' + data.byteLength);
            // Seems to be a valid PicoBoard.
            clearTimeout(watchdog);
            watchdog = null;
        });

        // Tell the board to send a input data every 50ms
        var pingCmd = new Uint8Array(1);
        pingCmd[0] = 0x54;
        
        poller = setInterval(function() {
            console.log('send ping cmd');
            device.send(pingCmd.buffer);
        }, 50);
        
        watchdog = setTimeout(function() {
            // This device didn't get good data in time, so give up on it. Clean up and then move on.
            // If we get good data then we'll terminate this watchdog.
            clearInterval(poller);
            poller = null;
            device.set_receive_handler(null);
            device.close();
            device = null;
            tryNextDevice();
        }, 250);
    };

    ext._deviceRemoved = function(dev) {
        if(device != dev) return;
        if(poller) poller = clearInterval(poller);
        device = null;
    };

    ext._shutdown = function() {
        if(device) device.close();
        if(poller) poller = clearInterval(poller);
        device = null;
    };

    ext._getStatus = function() {
        if(!device) return {status: 1, msg: 'Disconnected'};
        if(watchdog) return {status: 1, msg: 'Probing'};
        return {status: 2, msg: 'Connected'};
    }

    var descriptor = {
        blocks: [
            ['h', 'when %m.btns button pressed', 'whenButtonPressed', 'A']
        ],
        menus: {
            btns: ['A', 'B', 'any']
        },
        url: 'https://www.seeedstudio.com/'
    };
    ScratchExtensions.register('GroveZero', descriptor, ext, {type: 'serial'});
})({});