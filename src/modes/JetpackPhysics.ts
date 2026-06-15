export class JetpackPhysics {

  fuel=100;

  thrust=15;

  flying=false;

  update(dt:number){

    if(
      this.flying &&
      this.fuel>0
    ){

      this.fuel-=15*dt;
    }

    if(this.fuel<0){

      this.fuel=0;
    }
  }

  refill(){

    this.fuel=100;
  }
}
