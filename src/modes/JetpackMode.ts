export class JetpackMode {

  fuel=999999;

  consume(amount:number){
    this.fuel-=amount;
  }
}
