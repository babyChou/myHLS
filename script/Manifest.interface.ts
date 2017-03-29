export interface PlaylistItem {
	uri?: string;
	BANDWIDTH?: number;
	CODECS?: string;
	RESOLUTION?: {
		height:number;
		width:number;
	}
	'PROGRAM-ID'?:number;
}


export interface Manifest{
	abrSource? : Array<Object>;
	allowCache?: boolean;
	endList?: boolean;
	mediaSequence?: number;
	discontinuitySequence?: number;
	playlistType?: string;
	playlists ?: [ {
		attributes?: Object;
		timeline?: number;
		uri: string;
	} ];
	mediaGroups?: {
		AUDIO: {
			'GROUP-ID': {
				default: boolean;
				autoselect: boolean;
				language: string;
				uri: string;
				instreamId: string;
				characteristics: string;
				forced: boolean
			}
		};
		VIDEO: Object;
		'CLOSED-CAPTIONS': Object;
		SUBTITLES: Object
	};
	dateTimeString?: string;
	dateTimeObject?: Date;
	targetDuration: number;
	totalDuration?: number;
	discontinuityStarts?: [number];
	segments?: [
		{
			byterange?: {
				length: number;
				offset: number
			};
			duration: number;
			attributes?: Object;
			discontinuity?: number;
			uri: string;
			timeline: number;
			key?: {
				method: string;
				uri: string;
				iv: string
			};
			map?: {
				uri: string;
				byterange: {
					length: number;
					offset: number
				}
			};
			'cue-out'?: string;
			'cue-out-cont'?: string;
			'cue-in'?: string
		}
	]
}


