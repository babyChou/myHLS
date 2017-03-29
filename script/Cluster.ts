///<reference path='Player.d.ts'/>

import { log } from './Log';

export class Cluster {
	timeStart: number =  -1; //timecode start inclusive
	timeEnd: number = -1; //exclusive
	requested: boolean = false; //cluster download has started
	ready: boolean = false; //cluster has been downloaded and queued to be appended to source buffer
	buffered: boolean = false; //cluster has been added to source buffer
	data: any = null; //cluster data from vid file

	fileName: string;
	fileUrl: string;
	
	requestedTime: number = null;
	readyTime: number = null;

	byteStart:number;
	byteEnd:number;

	private transmuxer:any = new muxjs.mp4.Transmuxer();
	private createInitSegment:boolean;


	constructor(tsName, url, timeStart, timeEnd, byteStart?, byteEnd?) {

		let remuxedSegments = [];
		let remuxedBytesLength = 0;
		let remuxedInitSegment: Uint8Array;

		let bytes, i, j;

		this.fileName = tsName;
		this.fileUrl = `${url}/${tsName}`;
		this.timeStart = timeStart;
		this.timeEnd = timeEnd;

		this.byteStart = byteStart;
		this.byteEnd = byteEnd;

		this.transmuxer.on('data', function(event) {

			remuxedSegments.push(event);
			remuxedBytesLength += event.data.byteLength;
			remuxedInitSegment = event.initSegment;

		});

		this.transmuxer.on('done', function () {
			var offset = 0;
			if (this.createInitSegment) {
		  		bytes = new Uint8Array(remuxedInitSegment.byteLength + remuxedBytesLength);
		  		bytes.set(remuxedInitSegment, offset);
		  		offset += remuxedInitSegment.byteLength;
		  		this.createInitSegment = false;
			}else{
				bytes = new Uint8Array(remuxedBytesLength);
			}

			for (j = 0, i = offset; j < remuxedSegments.length; j++) {
				bytes.set(remuxedSegments[j].data, i);
				i += remuxedSegments[j].byteLength;
			}
		  	remuxedSegments = [];
		  	remuxedBytesLength = 0;
		  	//maybe need [] to cache
		  	this.data = bytes;

		  	this.ready = true;
			this.readyTime = new Date().getTime();
			console.log(1322313212);

			// window.vjsBuffer.appendBuffer(bytes);
			// if(video.currentTime<1) video.play();

		});




	}

	getData() {
		return this.data;
	}

	isReady() {
		return this.ready;
	}


	// download(callback): Promise<any> {
	download(): Promise<any> {
		let vidUrl = this.fileUrl;
		this.requested = true;
		this.requestedTime = new Date().getTime();


		return new Promise((resolve,reject) => {
			let self = this;
			let retryCount:number = 0;

			(function _getClusterData(){
				let xhr = new XMLHttpRequest();

				
				if (retryCount) {
					vidUrl += '?cacheBuster=' + this._makeCacheBuster();
				}

				xhr.open('GET', vidUrl, true);

				xhr.responseType = 'arraybuffer';
				xhr.timeout = 6000;
				// xhr.setRequestHeader('Range', 'bytes=' + this.byteStart + '-' + this.byteEnd);
				xhr.send();

				xhr.onload = (e) => {
					// if (xhr.status !== 206 && xhr.status !== 304) {
					if (xhr.status !== 206 && xhr.status !== 304 && xhr.status !== 200) {
						console.error("media: Unexpected status code " + xhr.status);
						return false;
					}
					
					self.pushData(new Uint8Array(xhr.response));
					resolve(self.data);
				};

				xhr.ontimeout = () => {
					
					if (retryCount == 2) {
						console.error("Given up downloading");
						reject();
					} else {
						retryCount++;
						_getClusterData();
					}
				}

			})();

		});
		// this._getClusterData(function() {
		// 	self.flushBufferQueue();
		// 	if (callback) {
		// 		callback();
		// 	}
		// })
	}

	private _makeCacheBuster() {
		let text = '';
		let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for (let i = 0; i < 10; i++)
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
	}


	private pushData(segment) {
		this.transmuxer.push(segment);
		this.transmuxer.flush();
		
	};


}