// picoExtension.js
// Shane M. Clements, February 2014
// PicoBoard Scratch Extension
//
// This is an extension for development and testing of the Scratch Javascript Extension API.

(function(ext) {
    var potentialDevices = [];
        
    var poller = null;
    var watchdog = null;
    var lastReadTime = 0;
    var connected = false;
    
    var device = null;
    var rawData = null;
    var inputArray = [];
    
    var pingCmd = new Uint8Array(1);
        pingCmd[0] = 0x01;

    var channels = {
        'Button A': 0,
        'Button B': 1
    };
    
    var inputs = {
        'Button A': 0,
        'Button B': 0
    };
    
    function getButtonPressed(which) {
        if (device == null) return false;
        if (which == 'A' && getButton('Button A')) return true;
        if (which == 'B' && getButton('Button B')) return true;
        return false;
    }

    function getButton(which) {
        return inputs[which];
    }

    function processData() {
        var bytes = new Uint8Array(rawData);

        inputArray[3] = 0;
        for(var i = 0; i < 4; i ++) {
            inputArray[i] = bytes[i];
        }
            
        if (watchdog && (inputArray[3] == 0x54)) {
            connected = true;
            
            clearTimeout(watchdog);
            watchdog = null;
            
            clearInterval(poller);
            poller = setInterval(function() {
              if (Date.now() - lastReadTime > 5000) {
                connected = false;
                device.set_receive_handler(null);
                device.close();
                device = null;
                clearInterval(poller);
                poller = null;
              }
            }, 2000);
        }
        
        rawData = null;
    }

    function tryNextDevice() {
        device = potentialDevices.shift();
        if (!device) return;

        device.open({stopBits: 0, bitRate: 57600, ctsFlowControl: 0}, function() {
            console.log('Attempting connection with ' + device.id);
            device.set_receive_handler(function(data) {
                
                lastReadTime = Date.now();
                
                if(!rawData || rawData.byteLength >= 4) {
                    rawData = new Uint8Array(data);
                    console.log('rawData: ' + rawData);
                    processData();
                }
            });
        });

        poller = setInterval(function() {
            device.send(pingCmd.buffer);
        }, 25);
        
        watchdog = setTimeout(function() {
            clearInterval(poller);
            poller = null;
            device.set_receive_handler(null);
            device.close();
            device = null;
            tryNextDevice();
        }, 5000);
    };

    ext.whenButtonPressed = function(which) {
        return getButtonPressed(which);
    };
    
    ext._getStatus = function() {
        if (connected) return {status: 2, msg: 'Connected'};
        else return {status: 1, msg: 'Disconnected'};
    }
    
    ext._deviceConnected = function(dev) {
        potentialDevices.push(dev);
        if (!device) tryNextDevice();
    }
    
    ext._deviceRemoved = function(dev) {
        console.log('device removed');
        if(device != dev) return;
        device = null;
    };

    ext._shutdown = function() {
        if(device) device.close();
        device = null;
    };

    var descriptor = {
        blocks: [
            ['h', 'when %m.btns button pressed', 'whenButtonPressed', 'A']
        ],
        menus: {
            btns: ['A', 'B']
        },
        url: 'www.seeedstudio.com'
    };
    ScratchExtensions.register('Grove Zero', descriptor, ext, {type: 'serial'});
})({});