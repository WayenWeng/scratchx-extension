(function(ext) {
  
  var connected = false;
  var device = null;
  var poller = null;
  var rawData = null;
  
  var BTN_UP = 0,
    BTN_DOWN = 1,
    BTN_HELD = 2;
  var buttonState = {A: 0, B: 0};
 
  /* TEMPORARY WORKAROUND
     this is needed since the _deviceRemoved method
     is not called when serial devices are unplugged*/
  var sendAttempts = 0;

  var pingCmd = new Uint8Array(1);
  pingCmd[0] = 0x54;

  ext.whenButtonPressed = function(btn) {
    if (btn === 'any')
      return buttonState['A'] == BTN_DOWN | buttonState['B'] == BTN_DOWN;
    return buttonState[btn] == BTN_DOWN;
  };
  
  ext._getStatus = function() {
    if (!connected)
      return { status:1, msg:'Disconnected' };
    else
      return { status:2, msg:'Connected' };
  };

  ext._deviceRemoved = function(dev) {
    // Not currently implemented with serial devices
  };

  var poller = null;
  ext._deviceConnected = function(dev) {
    sendAttempts = 0;
    connected = true;
    if (device) return;
    
    device = dev;
    device.open({ stopBits: 0, bitRate: 38400, ctsFlowControl: 0 });
    device.set_receive_handler(function(data) {
      sendAttempts = 0;
      console.log('Received: ' + data.byteLength);
    }); 

    poller = setInterval(function() {

      /* TEMPORARY WORKAROUND
         Since _deviceRemoved is not
         called while using serial devices */
      if (sendAttempts >= 10) {
        connected = false;
        device.close();
        device = null;
        rawData = null;
        clearInterval(poller);
        return;
      }
      
      device.send(pingCmd.buffer); 
      console.log("send pingcmd");
      sendAttempts++;

    }, 50);

  };

  ext._shutdown = function() {
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

  ScratchExtensions.register('littleBits', descriptor, ext, {type:'serial'});

})({});