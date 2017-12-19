import * as UUID from 'uuid'

export default class Group {
    uid: string;
    gid: string;
    owner: string;
    name: string;
    invitationPending: boolean;


    constructor( owner: string,uid: string, name: string, invitationPending: boolean) {
        this.gid = UUID.v4();
        this.uid = uid;
        this.owner = owner;
        this.name = name;
        this.invitationPending = invitationPending;
    }

    static from(owner: string, gid: string, name: string, others: {uid: string, invitationPending: boolean}[]): Group{
        let group = new Group(owner, owner, name, false);
        group['others'] = others;
        group.gid = gid;
        return group;
    }
}