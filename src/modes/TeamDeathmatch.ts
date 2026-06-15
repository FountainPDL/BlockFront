export class TeamDeathmatch {

  blue=0;

  red=0;

  target=50;

  addBlue(){
    this.blue++;
  }

  addRed(){
    this.red++;
  }

  winner(){

    if(this.blue>=this.target)
      return "BLUE";

    if(this.red>=this.target)
      return "RED";

    return null;
  }
}
