export class RespawnBeacon {

  active=true;

  use(){

    if(!this.active)
      return false;

    this.active=false;

    return true;
  }
}
