(function(ext) {
  
  var pingCmd = new Uint8Array(1);
  pingCmd[0] = 1;
  
  ext.whenButtonPressed = function() {
      return false
  }
  
  ext._getStatus = function() {
    if (!connected)
      return { status:1, msg:'Disconnected' };
    else
      return { status:2, msg:'Connected' };
  };

  ext._deviceRemoved = function(dev) {
    console.log('Device removed');
    // Not currently implemented with serial devices
  };

  var potentialDevices = [];
  ext._deviceConnected = function(dev) {
    potentialDevices.push(dev);
    if (!device)
      tryNextDevice();
  };

  var poller = null;
  var watchdog = null;
  function tryNextDevice() {
    device = potentialDevices.shift();
    if (!device) return;

    device.open({ stopBits: 0, bitRate: 57600, ctsFlowControl: 0 });
    console.log('Attempting connection with ' + device.id);
    device.set_receive_handler(function(data) {
      var inputData = new Uint8Array(data);
      console.log('Input data:' + inputData);
    });

    poller = setInterval(function() {
      device.send(pingCmd.buffer); 
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

  ext._shutdown = function() {
    // TODO: Bring all pins down
    if (device) device.close();
    if (poller) clearInterval(poller);
    device = null;
  };

  var descriptor = {
    blocks: [
            ['h', 'when %m.btns button pressed', 'whenButtonPressed', 'A']
        ],
        menus: {
            btns: ['A', 'B', 'any']
        },
        url: 'https://www.seeedstudio.com/'
  };

  ScratchExtensions.register('GroveZero', descriptor, ext, {type:'serial'});

})({});