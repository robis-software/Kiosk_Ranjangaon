import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  withCredentials:boolean = true

  constructor(private readonly http:HttpClient) { }

  post(api:any, body:any, headers?:any):Observable<any> {
    return this.http.post<any>(`http://${environment.api.host}:${environment.api.port}/${api}`, body, {withCredentials: this.withCredentials, headers})
  }

  put(api:any, body:any, headers?:any):Observable<any> {
    return this.http.put<any>(`http://${environment.api.host}:${environment.api.port}/${api}`, body, {withCredentials: this.withCredentials, headers})
  }

  get(api:any, body:any, headers?:any):Observable<any> {
    return this.http.get<any>(`http://${environment.api.host}:${environment.api.port}/${api}`, {...body, withCredentials: this.withCredentials, headers})
  }

  delete(api:any, body:any, headers?:any):Observable<any> {
    return this.http.delete<any>(`http://${environment.api.host}:${environment.api.port}/${api}`, {body, withCredentials: this.withCredentials, headers})
  }
}
