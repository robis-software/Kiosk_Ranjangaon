class Print {
    isProduction = false;

    log(...args:any) {
        !this.isProduction &&console.log(...args);
    }

    error(...args:any) {
        !this.isProduction &&console.error(...args);
    }
}

export default Print