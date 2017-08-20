import * as UUID from 'uuid'

export default class Artist {
    uid: string;
    firstName: string;
    lastName: string;

    constructor(firstName: string, lastName: string){
        this.uid = UUID.v4();
        this.firstName = firstName;
        this.lastName = lastName;
    }
}