export interface DamageNumber {

  id:number;

  x:number;

  y:number;

  value:number;

  age:number;
}

export class DamageNumbers {

  private nextId=1;

  list:DamageNumber[]=[];

  add(
    x:number,
    y:number,
    value:number
  ){

    this.list.push({

      id:this.nextId++,

      x,

      y,

      value,

      age:0
    });
  }

  update(dt:number){

    this.list=this.list.filter(n=>{

      n.age+=dt;

      n.y-=40*dt;

      return n.age<1;
    });
  }
}
