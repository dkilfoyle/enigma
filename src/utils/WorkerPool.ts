interface IWorkerJob {
  url: string;
  msg: any;
  handler: (msg: any, worker: Worker) => boolean;
  ctx: any;
}

export class WorkerPool {
  public jobs: IWorkerJob[];
  public numWorkers: number;
  public onDone?: () => void;

  constructor(public size: number = 4) {
    this.jobs = [];
    this.numWorkers = 0;
  }

  queueJob(url: string, msg: any, handler: (msg: any, worker: Worker) => boolean, ctx: any) {
    const job = { url, msg, handler, ctx };
    this.jobs.push(job);
    if (this.numWorkers < this.size) this.nextJob();
  }

  queueJobs(jobs: IWorkerJob[], onDone: () => void) {
    for (const job of jobs) {
      this.jobs.push(job);
    }
    this.onDone = onDone;
    while (this.numWorkers < Math.min(this.size, this.jobs.length)) this.nextJob();
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
          if (job.handler.call(job.ctx, e.data, worker)) {
            worker.terminate();
            this.numWorkers--;
            this.nextJob();
          }
        },
        false
      );
      worker.postMessage(job.msg);
    } else {
      if (this.numWorkers == 0 && this.onDone) this.onDone();
    }
  }
}
