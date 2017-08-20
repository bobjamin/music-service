import { ApiGatewayEvent, ApiGatewayContext } from "./lambda-events/lambda-events";
import ArtistService from "./artists/artist-service";
import Artist from "./artists/artist";
import * as AWS from 'aws-sdk';

export const musicHandler = (event: ApiGatewayEvent, context: ApiGatewayContext): void => {
    let musicService = new ArtistService(new AWS.DynamoDB.DocumentClient({region: 'eu-west-1'}), process.env.TABLE_NAME);
    if(event.path === "/artists"){
        if(event.httpMethod === "GET"){
            musicService.get().then((artists) => {
                context.done(null, {statusCode:200, body:JSON.stringify(artists), headers: {'Access-Control-Allow-Origin': '*'}})
            });
        }
        else if(event.httpMethod === "POST"){
            musicService.add(<Artist>JSON.parse(event.body)).then(() => {
                context.done(null, {statusCode:200, body:'Music Added', headers: {'Access-Control-Allow-Origin': '*'}})
            });
        }
    }
};

