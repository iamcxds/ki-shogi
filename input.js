// Ki Shogi - Keyboard input handler
const KEY = {
  UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right',
  ENTER: 'enter', ESC: 'esc', TAB: 'tab', Q: 'q', D: 'd', M: 'm', L: 'l',
  ONE: '1', TWO: '2', THREE: '3', FOUR: '4', SPACE: 'space', R: 'r',
};

function setupInput(callback) {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    console.error('Please run in terminal / 请在终端中运行: node main.js');
    process.exit(1);
  }
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  stdin.on('data', (data) => {
    const buf = Buffer.from(data, 'utf8');
    if (buf[0] === 0x1b && buf[1] === 0x5b) {
      switch (buf[2]) {
        case 0x41: return callback(KEY.UP);
        case 0x42: return callback(KEY.DOWN);
        case 0x43: return callback(KEY.RIGHT);
        case 0x44: return callback(KEY.LEFT);
      }
    } else if (buf[0] === 0x20) {
      return callback(KEY.SPACE);
    } else if (buf[0] === 0x09) {
      return callback(KEY.TAB);
    } else if (buf[0] === 0x0d || buf[0] === 0x0a) {
      return callback(KEY.ENTER);
    } else if (buf[0] === 0x1b) {
      return callback(KEY.ESC);
    } else if (buf[0] === 0x03) {
      // Ctrl+C
      return callback(KEY.Q);
    } else {
      const ch = data.toLowerCase();
      if (ch === 'q') return callback(KEY.Q);
      if (ch === 'd') return callback(KEY.D);
      if (ch === 'm') return callback(KEY.M);
      if (ch === 'l') return callback(KEY.L);
      if (ch === 'r') return callback(KEY.R);
      if (ch === '1') return callback(KEY.ONE);
      if (ch === '2') return callback(KEY.TWO);
      if (ch === '3') return callback(KEY.THREE);
      if (ch === '4') return callback(KEY.FOUR);
    }
  });
}

module.exports = { setupInput, KEY };
