export class PlayerState {

  health=100;

  maxHealth=100;

  shield=50;

  maxShield=50;

  sprinting=false;

  aiming=false;

  sliding=false;

  reloading=false;

  crouching=false;

  alive=true;

  level=1;

  xp=0;

  kills=0;

  deaths=0;

  addXP(amount:number){

    this.xp+=amount;

    while(this.xp>=100){

      this.xp-=100;

      this.level++;
    }
  }

  addKill(){

    this.kills++;

    this.addXP(25);
  }

  addDeath(){

    this.deaths++;
  }

  damage(amount:number){

    if(this.shield>0){

      const absorbed=Math.min(
        this.shield,
        amount
      );

      this.shield-=absorbed;

      amount-=absorbed;
    }

    if(amount>0){

      this.health-=amount;
    }

    if(this.health<=0){

      this.health=0;

      this.alive=false;
    }
  }

  heal(amount:number){

    this.health=Math.min(
      this.maxHealth,
      this.health+amount
    );
  }

  respawn(){

    this.health=this.maxHealth;

    this.shield=this.maxShield;

    this.alive=true;
  }
}
