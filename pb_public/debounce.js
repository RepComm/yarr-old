export class Debounce {
  constructor(minTime = 250) {
    this.minTime = minTime;
    this.lastTime = 0;
  }
  update() {
    let nowTime = Date.now();
    if (nowTime - this.lastTime > this.minTime) {
      this.lastTime = nowTime;
      return true;
    }
    return false;
  }
}