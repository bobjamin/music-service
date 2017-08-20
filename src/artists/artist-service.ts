import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";
import Artist from "./artist";
import {AWSError} from "aws-sdk";
import ScanOutput = DocumentClient.ScanOutput;

export default class ArtistService {
    documentClient: DocumentClient;
    tableName: string;

    constructor(documentClient: DocumentClient, tableName: string){
        this.documentClient = documentClient;
        this.tableName = tableName;
    }

    get(): Promise<Array<Artist>>{
        return new Promise((resolve, reject) => {
            this.documentClient.scan({ TableName: this.tableName }, (err:AWSError, data: ScanOutput) => {
                if(err){
                    reject(err);
                }
                else{
                    resolve(<Array<Artist>>data.Items);
                }
            });
        });
    }

    add(artist: Artist): Promise<any>{
        return new Promise((resolve, reject) => {
            let params: DocumentClient.PutItemInput = {
                TableName: this.tableName,
                Item: new Artist(artist.firstName, artist.lastName)
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
