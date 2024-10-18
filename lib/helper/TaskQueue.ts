export default class TaskQueue {
  private tasks: (() => Promise<void>)[] = [];
  private busy = false;

  async add(task: () => Promise<void>) {
    this.tasks.push(task);
    this.process();
  }

  private async process() {
    if (this.busy || this.tasks.length === 0) {
      return;
    }

    this.busy = true;
    const task = this.tasks.shift();

    if (task) {
      console.log("Processing task==============================");
      await task();
    }
    this.busy = false;

    this.process();
  }
}
