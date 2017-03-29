import { Player } from './Player';

$(() => {
	let myPlayer = new Player();

	myPlayer.initiate('https://mnmedias.api.telequebec.tv/m3u8/29880.m3u8'); //abr
	// myPlayer.initiate('http://qthttp.apple.com.edgesuite.net/1010qwoeiuryfg/0640_vod.m3u8');
});