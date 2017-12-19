import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";
import {AWSError} from "aws-sdk";
import ScanOutput = DocumentClient.ScanOutput;
import Music from "./music";
import * as S3 from "aws-sdk/clients/s3";
import Axios from 'axios';
import QueryOutput = DocumentClient.QueryOutput;
import Group from "./group";
let atob = require('atob');

export default class MusicService {
    documentClient: DocumentClient;
    s3Client: S3;
    tableName: string;
    groupTableName: string;

    constructor(documentClient: DocumentClient, tableName: string, groupTableName: string, s3Client: S3){
        this.documentClient = documentClient;
        this.tableName = tableName;
        this.s3Client = s3Client;
        this.groupTableName = groupTableName;
    }

    async getAllMusicIncludingGroupsFor(oid: string): Promise<any> {
        let groupInfo = await this.getGroupInfo(oid);
        let otherOwners = new Set<string>();
        groupInfo.joinedGroups.forEach(group => otherOwners.add(group.owner));
        let groupIn = (group) => groupInfo.joinedGroups.filter(g => g['actualGid'] === g).length > 0;
        let allMusic = [];
        let owners = Array.from(otherOwners.values());
        for(let i = 0;i<owners.length;i++){
            let othersMusic = await this.getFor(owners[i]);
            othersMusic.forEach(music => {
                if(music.groups && music.groups.filter(g => groupIn(g)).length > 0) {
                    allMusic.push(music);
                }
            })
        }
        let music = await this.getFor(oid);
        allMusic.forEach(m => music.push(m));
        return music;
    }

    getFor(oid: String): Promise<any>{
        return new Promise((resolve, reject) => {
            let params = {
                TableName: this.tableName,
                KeyConditionExpression: 'oid = :o_id',
                ExpressionAttributeValues: {
                    ':o_id': oid
                }
            };
            this.documentClient.query(params, (err:AWSError, data: QueryOutput) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data.Items);
                }
            });
        });
    }

    getThumbnailFor(uid: string): Promise<string>{
        return new Promise((resolve, reject) => {
            let params: S3.GetObjectRequest = {
                Bucket: 'music-repository-files',
                Key: uid + '/thumbnail.png'
            };
            this.s3Client.getObject(params, (err: AWSError, data: any) => {
                if(err){
                    console.error(err);
                    //Try and generate thumbnail
                    let data = Axios.get('https://u5zts36lsi.execute-api.eu-west-1.amazonaws.com/dev/thumbnail/' + uid)
                    .then(() => {
                        this.s3Client.getObject(params, (err: AWSError, data: any) => {
                            if(err){
                                reject(err);
                            }
                            else{
                                let body = data.Body.toString('base64');
                                resolve(body);
                            }
                        })
                    }
                    ).catch((err) => {
                        reject(err);
                    });
                }
                else{
                    let body = data.Body.toString('base64');
                    resolve(body);
                }
            });
        });
    }

    getSignedUrlFor(uid: string): string {
        let params: S3.GetObjectRequest = {
            Bucket: 'music-repository-files',
            Key: uid + '/pdf.pdf'
        };
        return this.s3Client.getSignedUrl('getObject', params);
    }

    add(music: Music): Promise<any>{
        console.log("Uploading PDF to s3");
        let item = new Music(music.oid, music.artist, music.genre, music.number, music.opus, music.name, music.instrument);
        let body = new Buffer(music.pdf,'base64');
        return new Promise((resolve, reject) => {
            let s3Params: S3.PutObjectRequest = {
                Bucket: 'music-repository-files',
                ContentType: 'application/pdf',
                ContentDisposition: 'inline',
                Key: item.uid + '/pdf.pdf',
                Body: body
            };

            this.s3Client.putObject(s3Params, (err) => {
                if(!err) {
                    let params: DocumentClient.PutItemInput = {
                        TableName: this.tableName,
                        Item: item
                    };
                    console.log("Adding to database");
                    console.log('dynamo request '+ JSON.stringify(params));
                    this.documentClient.put(params, (err: AWSError) => {
                        if (err) {
                            console.error(err);
                            reject(err);
                        }
                        else {
                            console.log("Complete");
                            resolve()
                        }
                    });
                }
                else{
                    console.error(err);
                    reject(err);
                }
            });
        });
    }

    createGroup(uid: string, name: string): Promise<void>{
        return new Promise(
            (resolve, reject) => this.documentClient.put({ TableName: this.groupTableName, Item: new Group(uid, uid, name, false) },
                (err: AWSError) =>  { if(err) { console.error(err); reject(err)} else resolve() }
            )
        );
    }

    async getGroupInfo(owner: string): Promise<{ownedGroups: Array<Group>, joinedGroups:Array<Group>}>{
        console.log('Looking for Groups for user' + owner);
        let groups = await this.allGroups();
        let ownedGroups = groups.filter(group => group.owner === owner);
        let othersInOwnedGroups = ownedGroups.filter(group => group.uid !== owner);
        let actualOwnedGroups = ownedGroups.filter(group => group.uid === owner);
        let joinedGroups = groups.filter(group => group.owner !== owner && group.uid === owner)
            .map(group => {
                group['actualGid'] = groups.filter(g => g.name === group.name && g.uid === group.owner)[0].gid;
                return group;
            });
        return {
            ownedGroups: actualOwnedGroups.map(group => Group.from(group.owner,group.gid, group.name, othersInOwnedGroups.filter(other => other.name === group.name).map(otherGroup => { return {gid: otherGroup.gid, uid: otherGroup.uid,invitationPending: otherGroup.invitationPending }}))),
            joinedGroups: joinedGroups
        }
    }

    private allGroups(): Promise<Array<Group>>{
        return new Promise(
            (resolve, reject) => this.documentClient.scan({  TableName: this.groupTableName },
                (err:AWSError, data: QueryOutput) => { if(err) { console.error(err); reject(err)} else resolve(<Array<Group>>data.Items) }
            )
        );
    }

    private groupByGid(gid: string, owner: string): Promise<Array<Group>>{
        return new Promise((resolve, reject) => {
            let params = {
                TableName: this.groupTableName,
                KeyConditionExpression: 'gid = :g_id AND uid = :u_id',
                ExpressionAttributeValues: {
                    ':g_id': gid,
                    ':u_id': owner
                }
            };
            this.documentClient.query(params, (err:AWSError, data: QueryOutput) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(<Array<Group>>data.Items);
                }
            });
        });
    }
    private groupByUid(uid: string): Promise<Array<Group>>{
        return new Promise((resolve, reject) => {
            let params = {
                TableName: this.groupTableName,
                KeyConditionExpression: 'uid = :u_id',
                ExpressionAttributeValues: {
                    ':u_id': uid
                }
            };
            this.documentClient.query(params, (err:AWSError, data: QueryOutput) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(<Array<Group>>data.Items);
                }
            });
        });
    }

    async invite(uid: string, owner: string, gid: string){
        let group = await this.groupByGid(gid, owner);
        if(group.length != 1 || (group[0].uid !== owner && group[0].owner !== owner)){
            throw new Error('Invalid or no Group Found');
        }
        else{
            let otherUsersGroups = await this.groupByUid(uid);
            otherUsersGroups.forEach((oGroup) => {
                if(oGroup.owner === owner && oGroup.name === group[0].name){
                    throw new Error('User already invited to group');
                }
            });
            return new Promise(
                (resolve, reject) => this.documentClient.put({ TableName: this.groupTableName, Item: new Group(owner, uid, group[0].name, true) },
                    (err: AWSError) =>  { if(err) { console.error(err); reject(err)} else resolve() }
                )
            );
        }
    }

    async removeInvitation(uid: string, owner: string, gid: string){
        let group = await this.groupByGid(gid, uid);
        if(group.length != 1 || (group[0].owner !== owner)){
            throw new Error('Invalid or no Group Found');
        }
        else{
            return new Promise(
                (resolve, reject) => this.documentClient.delete({ TableName: this.groupTableName, Key: { "gid": gid, "uid": uid } },
                    (err: AWSError) =>  { if(err) { console.error(err); reject(err)} else resolve() }
                )
            );
        }
    }

    async acceptInvitation(uid: string, gid: string, accept: boolean){
        let groups = await this.groupByGid(gid, uid);
        if(groups.length != 1){
            throw new Error('Invalid no of groups returned for gid');
        }
        else{
            if(groups[0].uid !== uid || !groups[0].invitationPending){
                throw new Error('No group invitation for this gid');
            }
            else{
                if(accept){
                    let params = {
                        ExpressionAttributeNames: {"#P": "invitationPending"},
                        ExpressionAttributeValues: {":i": false},
                        Key: {"gid": gid, "uid": uid},
                        ReturnValues: "ALL_NEW",
                        TableName: this.groupTableName,
                        UpdateExpression: "SET #P = :i"
                    };
                    await new Promise(
                        (resolve, reject) => this.documentClient.update(params,
                            (err: AWSError) => {
                                if (err) {
                                    console.error(err);
                                    reject(err)
                                } else resolve()
                            }
                        )
                    );
                }
                else{
                    return new Promise(
                        (resolve, reject) => this.documentClient.delete({ TableName: this.groupTableName, Key: { "gid": gid, "uid": uid } },
                            (err: AWSError) =>  { if(err) { console.error(err); reject(err)} else resolve() }
                        )
                    );
                }
            }
        }
    }

    async addPiecesToGroup(gid: string,uid: string, pieces: Array<{mid: string, groups: Array<string>}>){
        for(let i = 0;i<pieces.length;i++) {
            let piece = pieces[i];
            let params = {
                ExpressionAttributeNames: {"#P": "groups"},
                ExpressionAttributeValues: {":i": piece.groups},
                Key: {"uid": piece.mid, "oid": uid},
                ReturnValues: "ALL_NEW",
                TableName: this.tableName,
                UpdateExpression: "SET #P = :i"
            };
            await new Promise(
                (resolve, reject) => this.documentClient.update(params,
                    (err: AWSError) => {
                        if (err) {
                            console.error(err);
                            reject(err)
                        } else resolve()
                    }
                )
            );
        }

    }

}