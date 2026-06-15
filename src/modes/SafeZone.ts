export class SafeZone {

  x=0;

  y=0;

  radius=1000;

  shrinkRate=10;

  update(dt:number){

    this.radius-=this.shrinkRate*dt;

    if(this.radius<50){

      this.radius=50;
    }
  }

  contains(
    px:number,
    py:number
  ){

    const dx=px-this.x;

    const dy=py-this.y;

    return (
      dx*dx+dy*dy
    )<
    this.radius*this.radius;
  }
}
