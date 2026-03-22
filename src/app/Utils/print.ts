import { environment } from './../../environment/environment';

class Print {
  log(...args:any) {
    !environment.production && console.log(...args)
  }

  error(...args:any) {
    !environment.production && console.error(...args)
  }
}

export default Print;
