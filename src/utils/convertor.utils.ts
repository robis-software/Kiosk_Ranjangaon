import Print from "./print.utils";
class Convertor {
    print:any
    constructor() {
        this.print = new Print();
        this.print.log('Convertor Class instanced has been used!!');
    }

    /**
     * Used to convert an data into JSON format - Written with Chatgpt
     * @param response : string
     * @returns formatted JSON Data
     */
    convertResponseIntoJSON(response:string) {
    if(response === '' || response === undefined || response === null) return {};
    const jsonData = response.split('\n').filter(item => item.trim()).map(item => {
        const cleaned = item.replace(/'/g, '"');
        return JSON.parse(cleaned);
    })
    return jsonData
    }
}

export default Convertor