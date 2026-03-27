import dotenv from 'dotenv';
import axios from 'axios';
import Print from './print.utils';

dotenv.config();

class ApiUtils {
    baseURL:string = `http://${process.env.NAVITROL_CLIENT_IP}:${process.env.NAVITROL_CLIENT_PORT}`
    print!:Print;
    constructor() {
        this.print = new Print();
    }

    defaultHeaders:any = {
        'Authorization' : 'Basic cm9vdDp0b29y'
    }

    // GET Method
    get = async(endpoint:any, headers?:any): Promise<any> => {
        try {
            const response = await axios.get(`${this.baseURL}/${endpoint}`, {
                headers: {
                    ...this.defaultHeaders,
                    ...headers
                }
            });
            return response.data
        }
        catch (error:any) {
            this.print.error(`GET API ${endpoint}`,error);
            return error
        }

    }

    // POST Method
    post = async (endpoint: string, data: any, headers?: any): Promise<any> => {
        try {
            const response = await axios.post(`${this.baseURL}/${endpoint}`, data, { 
                headers : {
                    ...this.defaultHeaders,
                    ...headers
                }
            });
            return response;
        } catch (error: any) {
            this.print.error(`POST API ${endpoint}`,error);
            return error
        }
    };

    // PUT Method
    put = async (endpoint: string, data: any, headers?: any): Promise<any> => {
        try {
            const response = await axios.put(`${this.baseURL}/${endpoint}`, data, { 
                headers : {
                    ...this.defaultHeaders,
                    ...headers
                }
            });
            return response;
        } catch (error: any) {
            this.print.error(`PUT API ${endpoint}`,error);
            return error
        }
    };

}

export default ApiUtils