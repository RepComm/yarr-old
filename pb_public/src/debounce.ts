
export class Debounce {
  lastTime: number;
  minTime: number;

  constructor (minTime: number = 250) {
    this.minTime = minTime;
    this.lastTime = 0;
  }
  update (): boolean {
    let nowTime = Date.now();

    if (nowTime - this.lastTime > this.minTime) {
      this.lastTime = nowTime;
      return true;
    }
    return false;
  }
}
