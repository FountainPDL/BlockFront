export class ZombieMode {

  wave=1;

  zombies=10;

  nextWave(){

    this.wave++;

    this.zombies+=5;
  }
}
