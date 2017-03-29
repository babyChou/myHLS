class Log {
	private logs:Array<any> = [];

	constructor() {}

	addLog(info:any) {
		this.logs.push(info);
		console.log(info);
	}

	getLogs() {
		return this.logs;
	}

}

const log: Log = new Log();

export {log, Log};