import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TitleComponent } from "../../Components/title/title.component";
import { IconsComponent } from "../../Components/icons/icons.component";
import { Router, RouterLink } from "@angular/router";
import Print from '../../Utils/print';
import { ApiService } from '../../Services/api.service';
import { colors } from '../../Utils/colors';
import { SessionStorageService } from '../../Services/session-storage.service';
import { HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'ranjangaon-logs-password',
  standalone: true,
  imports: [CommonModule, TitleComponent, IconsComponent, RouterLink],
  templateUrl: './logs-password.component.html',
  styleUrl: './logs-password.component.css'
})
export class LogsPasswordComponent implements OnInit {
    password:any[] = [];
    keyPad:any[] = new Array(9).fill(null).map((data:any, index:any) => index+1)

    print!:Print;
    colors:any;

    isWrongPassword:boolean = false;

    constructor(private readonly api:ApiService, private readonly router:Router, private readonly ss:SessionStorageService){}

    ngOnInit(): void {
        this.print = new Print();
        this.colors = colors;
        this.print.log(this.password.length);

        const isAuthenicated = this.ss.getItem('_authenication');

        if(isAuthenicated) {
            this.router.navigate(['/logs/list']);
        }
        else {
            this.router.navigate(['/logs'])
        }
    }

    keyPadAction(key:string | number) {
        this.print.log(key);

        if(typeof(key) === 'number' && this.password.length < 6) {
            this.password[this.password.length] = key;
        }
        else if(key === 'CE') {
            this.password.length = 0;
        }
        else if(key === 'C') {
            this.password.pop();
        }

        if(this.password.length === 6) {
            this.validatePasswordAPI();
        }
    }

    private validatePasswordAPI() {

        // Internal helper Function - Used to Convert the password from array to string | number
        const formatPassword = (passwordArray:number[]) => {
            let passwordTemp = 0;
            const arrLen = passwordArray.length;
            passwordArray.forEach((value:number, index:number) => {
                passwordTemp += value * Math.pow(10, arrLen - (index + 1));
            })

            this.print.log('Password Entered!',passwordTemp);
            return passwordTemp;
        }

        let headers = new HttpHeaders()
        headers = headers.set('authorization', `Bearer ${formatPassword(this.password)}`)
        this.api.post('logs/authenicate', {}, headers).subscribe({
            next: (response:any) => {
                this.password.length = 0;
                if(response.data) {
                    this.ss.setItem('_authenication', response.data)
                    this.router.navigate(['/options']);
                }
                else {
                    this.router.navigate(['/authenicate']);

                }

                this.print.log(response);
            },
            error: (error:any) => {
                this.isWrongPassword = true
                this.print.error(error);

                setTimeout(()=>{
                this.password.length = 0;
                this.isWrongPassword = false;
                }, 300)
            }
        })
    }

}
