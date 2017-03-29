import { log } from './Log';

export class XstreamPaser {
	private manifest:Array<Object> = [];

	constructor(content:Array<string>) {
		let hasStream = !!content.find((str) => !!str.match(/\#EXT-X-STREAM-INF/));

		if(hasStream) {
			this.manifest = content.filter((str)=> str.trim().match(/\.m3u8$/) || str.match(/^\#EXT-X-STREAM-INF/) )
									.reduce((tempArr, currStr)=> {
										let str: string = currStr;
										let item: Object = {};

										if(str.match(/^\#EXT-X-STREAM-INF/)) {
											str = str.replace('#EXT-X-STREAM-INF:','');
											str.split(',')
												.map((val) => {
													let valArr = val.split('=');
													let _key = valArr[0].toLowerCase();
													item[_key] = valArr[1];
												});
											
											tempArr.push(item);
										}else{
											
											tempArr[tempArr.length - 1]['source'] = str;
											
										}
										return tempArr;
									}, <any>[]);

		}else{
			log.addLog(`content is not m3u8 abr sekma`);
		}

		
	}


	getManifest() {
		return this.manifest;
	}
}