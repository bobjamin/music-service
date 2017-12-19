import * as UUID from 'uuid'

export default class Music {
    uid: string;
    oid: string;
    artist: string;
    genre: string;
    number: number;
    opus: number;
    name: string;
    instrument: string;
    pdf?: string;


    constructor(oid: string, artist: string, genre: string, number: number, opus: number, name: string, instrument: string) {
        this.uid = UUID.v4();
        this.oid = oid;
        this.artist = artist;
        this.genre = genre;
        this.number = number;
        this.opus = opus;
        this.name = name;
        this.instrument = instrument;
    }
}