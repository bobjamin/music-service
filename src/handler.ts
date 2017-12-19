import { ApiGatewayEvent, ApiGatewayContext } from "./lambda-events/lambda-events";

import * as AWS from 'aws-sdk';
import MusicService from "./music/music-service";
import Music from "./music/music";

export const musicHandler = (event: ApiGatewayEvent, context: ApiGatewayContext): void => {
    console.log('Received Request for ' + event.path + ' -- ' + event.resource);
    let musicService = new MusicService(new AWS.DynamoDB.DocumentClient({region: 'eu-west-1'}), process.env.TABLE_NAME, process.env.GROUP_TABLE_NAME, new AWS.S3({region: 'eu-west-1'}));
    if(event.path === "/music"){
        if(event.httpMethod === "GET"){
            musicService.getAllMusicIncludingGroupsFor(event.requestContext.authorizer.claims['cognito:username']).then((music) => {
                context.done(null, {statusCode:200, body:JSON.stringify(music), headers: {'Access-Control-Allow-Origin': '*'}})
            });
        }
        else if(event.httpMethod === "POST"){
            let music = <Music>JSON.parse(event.body);
            music.oid = event.requestContext.authorizer.claims['cognito:username'];
            music.pdf = music.pdf.substring('data:application/pdf;base64,'.length);
            musicService.add(music).then(() => {
                context.done(null, {statusCode:200, body:'Music Added', headers: {'Access-Control-Allow-Origin': '*'}})
            });
        }
    }
    else if(event.resource === '/music/{uid}/thumbnail'){
        if(event.httpMethod === "GET"){
            musicService.getThumbnailFor(event.pathParameters['uid']).then(buffer => {
                context.done(null, {statusCode:200, body:buffer, headers: {'Content-type': 'image/png', 'Access-Control-Allow-Origin': '*'}})
            }).catch(() => {
                context.done(null, {statusCode:404, body:"", headers: { 'Access-Control-Allow-Origin': '*'}})
            })
        }
    }
    else if(event.resource === '/music/{uid}/pdf'){
        if(event.httpMethod === "GET"){
            context.done(null, {statusCode:200, body:musicService.getSignedUrlFor(event.pathParameters['uid']), headers: {'Access-Control-Allow-Origin': '*'}});
        }
    }
    else if(event.path === "/groups"){
        if(event.httpMethod === "GET"){
            musicService.getGroupInfo(event.requestContext.authorizer.claims['cognito:username']).then((groups) => {
                context.done(null, {statusCode:200, body:JSON.stringify(groups), headers: {'Access-Control-Allow-Origin': '*'}})
            });
        }
        else if(event.httpMethod === "POST"){
            let groupInfo = <{name: string}>JSON.parse(event.body);
            musicService.createGroup(event.requestContext.authorizer.claims['cognito:username'], groupInfo.name).then(() => {
                context.done(null, {statusCode:200, body:'Group Added', headers: {'Access-Control-Allow-Origin': '*'}})
            });
        }
    }
    else if(event.resource === '/groups/{gid}/invitation'){
        if(event.httpMethod === "POST"){
            let invitationInfo = <{accept: boolean, uid: string, remove: boolean}>JSON.parse(event.body);
            let owner = event.requestContext.authorizer.claims['cognito:username'];
            let gid = event.pathParameters['gid'];
            let promise;
            if(invitationInfo.uid){
                if(invitationInfo.remove){
                    promise = musicService.removeInvitation(invitationInfo.uid, owner, gid)
                }
                else {
                    promise = musicService.invite(invitationInfo.uid, owner, gid)
                }
            }
            else{
                promise = musicService.acceptInvitation(owner, gid, invitationInfo.accept);
            }
            promise.then(() => {
                context.done(null, {statusCode:200, body:'Invitation Sorted', headers: {'Access-Control-Allow-Origin': '*'}})
            });
        }
    }
    else if(event.resource === '/groups/{gid}/music') {
        if (event.httpMethod === "POST") {
            let groupInfo = <{pieces: Array<{mid: string, groups: Array<string>}>}>JSON.parse(event.body);
            let uid = event.requestContext.authorizer.claims['cognito:username'];
            let gid = event.pathParameters['gid'];
            musicService.addPiecesToGroup(gid,uid, groupInfo.pieces).then(() => {
                context.done(null, {statusCode:200, body:'Done', headers: {'Access-Control-Allow-Origin': '*'}})
            });
        }
    }
};

