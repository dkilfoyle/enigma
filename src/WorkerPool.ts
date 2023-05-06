interface IWokerJob {
  url: string;
  msg: any;
  cb: (msg: any, worker: Worker) => boolean;
  ctx: any;
}

export class WorkerPool {
  public jobs: IWokerJob[];
  public numWorkers: number;

  constructor(public size: number = 4) {
    this.jobs = [];
    this.numWorkers = 0;
  }

  queueJob(url: string, msg: any, cb: (msg: any, worker: Worker) => boolean, ctx: any) {
    const job = { url, msg, cb, ctx };
    this.jobs.push(job);
    if (this.numWorkers < this.size) this.nextJob();
  }

  nextJob() {
    if (this.jobs.length > 0) {
      const job = this.jobs.shift();
      if (!job) throw Error();

      const worker = new Worker(job.url, { type: "module" });
      this.numWorkers++;

      worker.addEventListener(
        "message",
        (e) => {
          if (job.cb.call(job.ctx, e.data, worker)) {
            worker.terminate();
            this.numWorkers--;
            this.nextJob();
          }
        },
        false
      );
      worker.postMessage(job.msg);
    }
  }
}
