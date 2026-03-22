import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class SessionStorageService {

  setItem(key: string, value: any) {
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  getItem(key:string) {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  removeItem(key:string) {
    sessionStorage.removeItem(key)
  }

  clearItem() {
    sessionStorage.clear();
  }
}
