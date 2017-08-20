import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";
import {AWSError} from "aws-sdk";
import ScanOutput = DocumentClient.ScanOutput;
import Music from "./music";

export default class MusicService {
    documentClient: DocumentClient;
    tableName: string;

    constructor(documentClient: DocumentClient, tableName: string){
        this.documentClient = documentClient;
        this.tableName = tableName;
    }

    get(): Promise<Array<Music>>{
        return new Promise((resolve, reject) => {
            this.documentClient.scan({ TableName: this.tableName }, (err:AWSError, data: ScanOutput) => {
                if(err){
                    reject(err);
                }
                else{
                    resolve(<Array<Music>>data.Items);
                }
            });
        });
    }

    add(music: Music): Promise<any>{
        return new Promise((resolve, reject) => {
            let params: DocumentClient.PutItemInput = {
                TableName: this.tableName,
                Item: new Music(music.owner, music.artist, music.genre, music.number, music.opus, music.name, music.instrument)
            };
            this.documentClient.put(params, (err:AWSError) => {
                if(err){
                    reject(err);
                }
                else{
                    resolve()
                }
            });
        });
    }
}
