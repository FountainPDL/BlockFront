export interface KillMessage {

  id:number;

  killer:string;

  victim:string;

  age:number;
}

export class KillFeed {

  private nextId=1;

  messages:KillMessage[]=[];

  add(
    killer:string,
    victim:string
  ){

    this.messages.push({

      id:this.nextId++,

      killer,

      victim,

      age:0
    });
  }

  update(dt:number){

    this.messages=this.messages.filter(m=>{

      m.age+=dt;

      return m.age<6;
    });
  }
}
