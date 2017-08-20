import * as UUID from 'uuid'

export default class Music {
    uid: string;
    owner: string;
    artist: string;
    genre: string;
    number: number;
    opus: number;
    name: string;
    instrument: string;


    constructor(owner: string, artist: string, genre: string, number: number, opus: number, name: string, instrument: string) {
        this.uid = UUID.v4();
        this.owner = owner;
        this.artist = artist;
        this.genre = genre;
        this.number = number;
        this.opus = opus;
        this.name = name;
        this.instrument = instrument;
    }
}