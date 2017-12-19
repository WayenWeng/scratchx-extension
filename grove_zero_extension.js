
// This is an extension for development and testing of the Scratch Javascript Extension API.

(function(ext) {
    var potentialDevices = [];
    var watchdog = null;
    var poller = null;
    var device = null;
    
    var lastReadTime = 0;
    var connected = false;
    var command = null;
    var parsingCmd = false;
    var bytesRead = 0;
    var waitForData = 0;
    var storedInputData = new Uint8Array(1024);
    
    var CMD_PING = 0x70,
        CMD_PING_CONFIRM = 0x71,
        CMD_BUTTON_READ = 0x72;
        
    var buttonData = 0;
    
    function pingDevice() {
        device.send(new Uint8Array([CMD_PING]).buffer);
    }

    function tryNextDevice() {
        device = potentialDevices.shift();
        if (!device) return;

        device.open({stopBits: 0, bitRate: 57600, ctsFlowControl: 0}, function() {
            console.log('Connection with ' + device.id);
            device.set_receive_handler(function(data) {
                processInput(new Uint8Array(data));
            });
        });

        poller = setInterval(function() {
            pingDevice();
            console.log('ping device');
        }, 1000);
        
        watchdog = setTimeout(function() {
            clearInterval(poller);
            poller = null;
            device.set_receive_handler(null);
            device.close();
            device = null;
            tryNextDevice();
        }, 5000);
    }
    
    function processInput(inputData) {
        console.log(inputData);
        lastReadTime = Date.now();
        console.log('last read time: ' + lastReadTime);
        for (var i = 0; i < inputData.length; i ++) {
            if (parsingCmd) {
                storedInputData[bytesRead ++] = inputData[i];
                if (bytesRead === waitForData) {
                    parsingCmd = false;
                    processCommand();
                }
            }
            else {
                switch (inputData[i]) {
                    case CMD_PING:
                        parsingCmd = true;
                        command = inputData[i];
                        waitForData = 2;
                        bytesRead = 0;
                    break;
                    case CMD_BUTTON_READ:
                        parsingCmd = true;
                        command = inputData[i];
                        waitForData = 1;
                        bytesRead = 0;
                    break;
                }
            }
        }
    }
    
    function processCommand() {
        switch (command) {
            case CMD_PING:
                if (storedInputData[0] === CMD_PING_CONFIRM) {
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
            break;
            
            case CMD_BUTTON_READ:
                buttonData = storedInputData[0];
            break;
        }
    }

    ext.whenButtonPressed = function(btn) {
        if(btn == 'A') {
            if((buttonData >= 1) && (buttonData <= 3) ) return true;
            else return false;
        }
        else if(btn == 'B') {
            if((buttonData >= 4) && (buttonData <= 6) ) return true;
            else return false;
        }
        else return false;
    };
    
    ext._getStatus = function() {
        if (connected) return { status: 2, msg: 'Connected' }
        else return { status: 1, msg: 'Disconnected' }
    };
    
    ext._deviceConnected = function(dev) {
        potentialDevices.push(dev);
        if (!device) tryNextDevice();
    };
    
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