///<reference path='Player.d.ts'/>

import { log } from './Log';
import { Cluster } from './Cluster';
import { Manifest, PlaylistItem } from './Manifest.interface';

enum ManifestType { hls, dash, ss };


export class Player {
	private clusters:Array<Cluster> = [];
	private renditions:Array<PlaylistItem> = [];
	private rendition: PlaylistItem = {};

	private reloadTimer: number;
	private reloadTime: number = -1;

	private cacheXhrSegmentContent: string;
	private manifest: Manifest;
	private isAbr:boolean = false;

	private mediaSource: MediaSource;
	private sourceBuffer: SourceBuffer;

	private videoElement: HTMLMediaElement;
	private source: string;
	private parentElement: string = 'body';

	private parser: any; 

	constructor() {}

	private checkSourceType(source:string) {
		let url = (source.split('?')[0]).split('#')[0];

		if(url.match(/.m3u8$/)) {
			return ManifestType.hls;
		}else if(url.match(/.mpd$/)) {
			return ManifestType.dash;
		}else{
			return ManifestType.ss;
		}

	}

	private getXhrResponType(source: string) {
		let typeTable = {
			hls : 'text',
			dash : 'xml',
			ss : 'xml'
		};

		let mapped:string = ManifestType[this.checkSourceType(source)];

		return typeTable[mapped];

	}

	private getBufferFormat() {
		let mediaFormat = {
			hls : 'video/mp4;codecs="mp4a.40.2, avc1.4d401f"',
			dash : 'video/mp4;codecs="mp4a.40.2, avc1.4d401f"',
			ss : 'video/mp4;codecs="mp4a.40.2, avc1.4d401f"'
		};
		let mapped:string = ManifestType[this.checkSourceType(this.source)];

		return mediaFormat[mapped];
	}

	private downloadManifest(isInit:boolean, callback?:Function) {
		let self = this;
		let xhr = new XMLHttpRequest();

		xhr.open('GET', this.source, true);

		xhr.responseType = this.getXhrResponType(this.source);

		xhr.send();

		xhr.onload = (e) =>{
			if(this.checkSourceType(this.source) === ManifestType.hls) {
				let content = xhr.response.split('\n');
				let segmentContent = '';
				let abtList = '';

				this.parser = new m3u8Parser.Parser();

				this.parser.push(xhr.response);
				this.parser.end();

				if(isInit) {
					log.addLog('source is Adative bitrate');
					this.isAbr = !!content.find((str) => str.match(/\#EXT-X-STREAM-INF/));
				}

				this.manifest = this.parser.manifest;

				
				if(this.isAbr && isInit) {
					log.addLog('Caching abr manifest data in renditions');
					this.manifest
						.playlists
						.map((info) => {
							let manifestAttr = info.attributes;
							this.renditions.push({
								uri : info.uri,
								...manifestAttr
							});
						});

					this.rendition = this.renditions[0];
					this.source = this.rendition.uri;

					log.addLog('Source is abr call downloadManifest again');
					this.downloadManifest(false, callback);


				}else{
					
					segmentContent = content.filter((str)=> str.trim().match(/\.ts$/) || str.match(/^\#EXTINF/) ).join('\n');

					if(this.cacheXhrSegmentContent !== segmentContent) {
	
						//cache [new cluster] 
						let timeStart = 0;
						let timeEnd = -1;

						// console.log(this.manifest.segments);

						if(this.clusters.length === 0) {

							this.manifest.segments.map((info) => {
								timeEnd = timeStart + info.duration;
								this.clusters.push(new Cluster(info.uri, '', timeStart, timeEnd ));
								timeStart += timeEnd;

							});
						}else{

							this.manifest.segments.map((info) => {

								this.clusters.map((cluster) => {
					
									if(info.uri === cluster.fileName) {
										return true;
									}
					
								});

								timeEnd = timeStart + info.duration;
								this.clusters.push(new Cluster(info.uri, '', timeStart, timeEnd ));
								timeStart += timeEnd;

							});
						}
						
					}

					log.addLog('setup Reload Timer');
					this.setupReloadTimer(segmentContent);

					if(typeof callback === 'function') {
						callback();
					}
				}

			}else if(this.checkSourceType(this.source) === ManifestType.dash){

			}else{

			}

		};

		xhr.onerror = (e) => {
			log.addLog(`Download Manifest error ${e}`);
		};
	}

	private setupReloadTimer(segmentContent) {
		if(!!this.manifest.targetDuration) {
			this.reloadTime = this.manifest.targetDuration*1000;
		}else{
			this.reloadTime = 5000;
		}

		if(this.cacheXhrSegmentContent === segmentContent) {
			//if segment equal to previous content. The reloadTime must to divide / 2
			this.reloadTime = Math.floor(this.reloadTime/2);
			clearTimeout(this.reloadTimer);
			this.reloadTimer = 0;
		}

		this.cacheXhrSegmentContent = segmentContent;

		if(!this.reloadTimer) {
			this.reloadTimer = setTimeout(() => this.downloadManifest(false), this.reloadTime);
		}
	}

	private createMediaSource():void {
		log.addLog("Creating media source");

		this.videoElement = document.createElement('video');

	    this.mediaSource = new MediaSource();
	    this.mediaSource.addEventListener('sourceopen', () => {
	        log.addLog("Creating source buffer");
	        this.createSourceBuffer();
	    }, false);
	    
	    this.videoElement.src = window.URL.createObjectURL(this.mediaSource);

	    if($('#'+ this.parentElement).length === 0) {
	    	this.parentElement = 'body';
	    }

	    $(this.parentElement).append($(this.videoElement));

	}

	private createSourceBuffer() {
		let codec = this.getBufferFormat();
		this.sourceBuffer = this.mediaSource.addSourceBuffer(codec);
		this.sourceBuffer.addEventListener('updateend', () => {
			//append buffer
			this.flushBufferQueue();
		}, false);

		log.addLog("Downloading init manifast");

		this.downloadInitCluster();

		this.videoElement.addEventListener('timeupdate', () => {
			this.downloadUpcomingClusters();
			// this.checkBufferingSpeed();
		}, false);
	}

	downloadInitCluster() {
		let promiseArr = [];

		while(this.clusters.length >= 3){
			this.clusters.shift();
		}

		this.clusters
			.map((cluster) => {
				log.addLog("cluster downloading");
				promiseArr.push(cluster.download());
			});

		Promise.all(promiseArr)
				.then((data) => {
					this.flushBufferQueue();
				});

		
		
	}

	flushBufferQueue() {
		if (!this.sourceBuffer.updating) {
			let bufferQueue: Array<Cluster> = this.clusters.filter((cluster) => {
				return cluster.ready && !cluster.buffered;
			});


			bufferQueue.map((cluster) => {
				this.sourceBuffer.appendBuffer(cluster.data);
				this.cluster.buffered = true;
			});

		}
		
	}

	downloadUpcomingClusters() {
		this.clusters
			.map((cluster) => {
				if(!cluster.ready) {

					cluster.download()
							.then(()=>{
								this.flushBufferQueue();
							});
				}
			});
	}

	clearUp() {
		if (this.videoElement) {
			$(this.videoElement).remove();
			delete this.mediaSource;
			delete this.sourceBuffer;
			this.clusters = [];
			this.rendition = {};

		}
	}

	initiate(source: string, parentElementId?: string) {
		if (!MediaSource) {
			log.addLog("Your browser is not supported");
			return;
		}
		this.clearUp();
		this.source = source;
		this.parentElement = parentElementId;

		log.addLog("Downloading Manifest file");
		this.downloadManifest(true, ()=>{
			this.createMediaSource();
		});

	}



}