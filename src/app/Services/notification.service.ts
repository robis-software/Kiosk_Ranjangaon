import { MessageService } from 'primeng/api';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class NotificationService {

  constructor(private readonly toast:MessageService,) { }
  timer:number = 2500

  success(title:string, message:string){
    this.toast.add({
      severity:'success',
      summary:title,
      detail: message,
      life: this.timer,
      closable: true
    })
  }

  info(title:string, message:string,){
    this.toast.add({
      severity:'info',
      summary:title,
      detail: message,
      life: this.timer,
      closable: true
    })
  }

  warn(title:string, message:string,){
    this.toast.add({
      severity:'warn',
      summary:title,
      detail: message,
      life: this.timer,
      closable: true
    })
  }

  error(title:string, message:string,){
    this.toast.add({
      severity:'error',
      summary:title,
      detail: message,
      life: this.timer,
      closable: true
    })
  }

  secondary(title:string, message:string,){
    this.toast.add({
      severity:'secondary',
      summary:title,
      detail: message,
      life: this.timer,
      closable: true
    })
  }

  contrast(title:string, message:string,){
    this.toast.add({
      severity:'contrast',
      summary:title,
      detail: message,
      life: this.timer,
      closable: true
    })
  }

}
