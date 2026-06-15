export class ReviveSystem {

  reviveTime=5;

  reviveProgress=0;

  reviving=false;

  start(){

    this.reviving=true;

    this.reviveProgress=0;
  }

  update(dt:number){

    if(!this.reviving)
      return false;

    this.reviveProgress+=dt;

    if(
      this.reviveProgress>=
      this.reviveTime
    ){

      this.reviving=false;

      return true;
    }

    return false;
  }
}
