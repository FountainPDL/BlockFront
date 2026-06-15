export class SurvivalMode {

  wave=1;

  enemies=5;

  nextWave(){

    this.wave++;

    this.enemies+=3;
  }
}
